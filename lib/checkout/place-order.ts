import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { CheckoutSchema } from '../checkout-schema.ts'
import { buildQuote, quoteFingerprint, type LineProblem, type Quote, type QuoteProduct } from './quote.ts'
import { receiptToken } from './receipt-token.ts'

/** Línea tal como queda guardada en orders.items: lo que se cobró, no lo que dijo el navegador. */
export type OrderLine = { slug: string; name: string; size: string; qty: number; unit_price_cents: number }

export type NewOrderRow = {
  id: string
  idempotency_key: string
  request_hash: string
  status: 'awaiting_payment'
  full_name: string
  email: string
  address: string
  province: string
  postal_code: string
  items: OrderLine[]
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
}

export type StoredOrder = Pick<NewOrderRow, 'id' | 'request_hash' | 'email' | 'items' | 'shipping_cents' | 'total_cents'> & {
  status: string
  payment_url: string | null
}

/** Lo que la orquestación necesita de la base. En las pruebas es un doble en memoria. */
export type OrderStore = {
  loadCatalog: (slugs: string[]) => Promise<QuoteProduct[]>
  findByIdempotencyKey: (key: string) => Promise<StoredOrder | null>
  /** 'duplicate_key' cuando otra petición con la misma clave insertó antes. */
  insert: (row: NewOrderRow) => Promise<'inserted' | 'duplicate_key'>
  savePayment: (orderId: string, payment: { checkoutId: string; url: string }) => Promise<void>
}

/** Crea el cobro en la pasarela para un pedido ya guardado y devuelve a dónde mandar al comprador. */
export type CheckoutGateway = (order: {
  orderId: string
  payerEmail: string
  lines: OrderLine[]
  shipping_cents: number
  total_cents: number
  receiptUrl: string
}) => Promise<{ checkoutId: string; url: string }>

export type PlaceOrderDeps = {
  store: OrderStore
  createCheckout: CheckoutGateway
  receiptSecret: string
  siteUrl: string
  newId?: () => string
}

export const PlaceOrderSchema = CheckoutSchema.extend({
  idempotency_key: z.uuid('Falta la clave del intento de compra.'),
  accepted_fingerprint: z.string().max(20_000),
})

export type PlaceOrderInput = z.input<typeof PlaceOrderSchema>

export type PlaceOrderResult =
  | { ok: true; orderId: string; receiptUrl: string; paymentUrl: string }
  | { ok: false; code: 'INVALID' | 'IDEMPOTENCY_CONFLICT' | 'PAYMENT_UNAVAILABLE' | 'ERROR'; error: string }
  | { ok: false; code: 'QUOTE_CHANGED'; error: string; quote: Quote; fingerprint: string }
  | { ok: false; code: 'UNAVAILABLE'; error: string; problems: LineProblem[]; quote: Quote; fingerprint: string }

type Parsed = z.output<typeof PlaceOrderSchema>

/**
 * Huella de lo que pidió el comprador con una clave. Ordena las líneas para que el
 * orden del carrito no cuente como contenido distinto.
 */
function requestHash({ full_name, email, address, province, postal_code, items }: Parsed) {
  const lines = items.map(({ slug, size, qty }) => [slug, size, qty]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  return createHash('sha256').update(JSON.stringify([full_name, email, address, province, postal_code, lines])).digest('hex')
}

/**
 * Registra el pedido y crea su cobro. Idempotente por `idempotency_key`: si la
 * respuesta se pierde, reenviar lo mismo devuelve el mismo pedido y el mismo enlace
 * de pago, aunque los precios hayan cambiado después. Nada se inserta si la
 * cotización aceptada ya no es la vigente o si alguna línea no se puede vender.
 */
export async function placeOrder(deps: PlaceOrderDeps, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = PlaceOrderSchema.safeParse(input)
  if (!parsed.success) return { ok: false, code: 'INVALID', error: parsed.error.issues[0].message }
  const data = parsed.data
  const hash = requestHash(data)

  try {
    const existing = await deps.store.findByIdempotencyKey(data.idempotency_key)
    if (existing) return resume(deps, existing, hash)

    const catalog = await deps.store.loadCatalog([...new Set(data.items.map((i) => i.slug))])
    const { quote, problems } = buildQuote(catalog, data.items)
    const fingerprint = quoteFingerprint(quote)
    if (problems.length) {
      return { ok: false, code: 'UNAVAILABLE', error: 'Algunas prendas ya no están disponibles como las pediste.', problems, quote, fingerprint }
    }
    if (fingerprint !== data.accepted_fingerprint) {
      return { ok: false, code: 'QUOTE_CHANGED', error: 'El total cambió desde que lo viste. Revisalo antes de seguir.', quote, fingerprint }
    }

    const row: NewOrderRow = {
      id: (deps.newId ?? randomUUID)(),
      idempotency_key: data.idempotency_key,
      request_hash: hash,
      status: 'awaiting_payment',
      full_name: data.full_name,
      email: data.email,
      address: data.address,
      province: data.province,
      postal_code: data.postal_code,
      items: quote.lines.map(({ slug, name, size, qty, unit_price_cents }) => ({ slug, name, size, qty, unit_price_cents })),
      subtotal_cents: quote.subtotal_cents,
      shipping_cents: quote.shipping_cents,
      total_cents: quote.total_cents,
    }

    if (await deps.store.insert(row) === 'duplicate_key') {
      // Otra petición con la misma clave insertó entre la búsqueda y el insert.
      const winner = await deps.store.findByIdempotencyKey(data.idempotency_key)
      if (!winner) throw new Error('Clave duplicada sin pedido que la tenga.')
      return resume(deps, winner, hash)
    }
    return resume(deps, { ...row, payment_url: null }, hash)
  } catch (error) {
    console.error('Error registrando el pedido:', error)
    return { ok: false, code: 'ERROR', error: 'No pudimos registrar el pedido. Probá de nuevo: no se va a duplicar.' }
  }
}

async function resume(deps: PlaceOrderDeps, order: StoredOrder, hash: string): Promise<PlaceOrderResult> {
  if (order.request_hash !== hash) {
    return { ok: false, code: 'IDEMPOTENCY_CONFLICT', error: 'Este intento de compra ya se usó con otros datos. Recargá la página y volvé a intentarlo.' }
  }
  const receiptUrl = `${deps.siteUrl}/pedido/${order.id}?t=${receiptToken(deps.receiptSecret, order.id)}`
  if (order.payment_url) return { ok: true, orderId: order.id, receiptUrl, paymentUrl: order.payment_url }

  let payment: { checkoutId: string; url: string }
  try {
    payment = await deps.createCheckout({
      orderId: order.id,
      payerEmail: order.email,
      lines: order.items,
      shipping_cents: order.shipping_cents,
      total_cents: order.total_cents,
      receiptUrl,
    })
  } catch (error) {
    console.error('Error creando el cobro del pedido', order.id, error)
    return { ok: false, code: 'PAYMENT_UNAVAILABLE', error: 'No pudimos conectar con Mercado Pago. Probá de nuevo: tu pedido no se va a duplicar.' }
  }
  await deps.store.savePayment(order.id, payment)
  return { ok: true, orderId: order.id, receiptUrl, paymentUrl: payment.url }
}
