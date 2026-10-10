import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { PaymentInfo } from './checkout/payment-sync.ts'
import type { CheckoutGateway } from './checkout/place-order.ts'

/**
 * Integración con Mercado Pago Checkout Pro por su API REST, con fetch: crear la
 * orden de pago, leerla y validar la firma de las notificaciones. Sólo servidor.
 */

type HeaderValue = string | null | undefined

/**
 * Firma de una notificación (cabecera x-signature: "ts=...,v1=<hex>").
 * Texto firmado: "id:<data.id de la URL>;request-id:<x-request-id>;ts:<ts>;", omitiendo
 * los segmentos sin valor. HMAC-SHA256 en hexadecimal con la clave secreta de la app.
 *
 * No se exige frescura del ts: la documentación y los SDK oficiales no se ponen de
 * acuerdo en si va en segundos o milisegundos, y los reintentos llegan hasta 96 h
 * después. La defensa contra repeticiones es otra: el pago siempre se relee de la API
 * y confirmarlo es idempotente. La doc pide pasar data.id a minúsculas y el SDK actual
 * lo deja tal cual; se aceptan ambas formas (para pagos es numérico y da igual).
 */
export function verifyWebhookSignature({ secret, xSignature, xRequestId, dataId }: {
  secret: string
  xSignature: HeaderValue
  xRequestId: HeaderValue
  dataId: HeaderValue
}): boolean {
  if (!xSignature) return false
  const pairs = new Map(xSignature.split(',').flatMap((part) => {
    const eq = part.indexOf('=')
    return eq === -1 ? [] : [[part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim()] as const]
  }))
  const ts = pairs.get('ts')
  const v1 = pairs.get('v1')
  if (!ts || !/^\d+$/.test(ts) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false

  const given = Buffer.from(v1.toLowerCase(), 'hex')
  const id = dataId?.trim() ?? ''
  const requestId = xRequestId?.trim() ?? ''
  const matches = (manifestId: string) => {
    const manifest = [
      manifestId && `id:${manifestId}`,
      requestId && `request-id:${requestId}`,
      `ts:${ts}`,
    ].filter(Boolean).join(';') + ';'
    const expected = createHmac('sha256', secret).update(manifest).digest()
    return timingSafeEqual(expected, given)
  }
  return matches(id) || (id !== id.toLowerCase() && matches(id.toLowerCase()))
}

// ---------------------------------------------------------------------------
// API de Órdenes (Checkout Pro). Mercado Pago marca Preferencias como legacy.
// ---------------------------------------------------------------------------

const API = 'https://api.mercadopago.com/v1/orders'

type MpConfig = { mpAccessToken: string }

/** Centavos a importe de Mercado Pago: texto con dos decimales, sin pasar por flotantes. */
export const centsToAmount = (cents: number) =>
  `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

/** Importe de Mercado Pago ("28900.00", "28900", "0.1") a centavos; null si no es un importe. */
export function amountToCents(amount: unknown): number | null {
  if (typeof amount !== 'string') return null
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount)
  return match ? Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0')) : null
}

/**
 * Crea la orden de Checkout Pro de un pedido ya guardado. La clave de idempotencia es
 * la referencia del pedido y el cuerpo sale entero de lo guardado, así que reenviarlo
 * es la misma petición. Mercado Pago no documenta si repite la respuesta o contesta
 * 409 (clave usada); ante el 409 se crea con una clave nueva: en el peor caso queda
 * una orden de más sin pagar, que vence sola, y un doble cobro iría a revisión.
 */
export function mercadoPagoCheckout(config: MpConfig, doFetch: typeof fetch = fetch): CheckoutGateway {
  return async ({ orderId, payerEmail, lines, shipping_cents, total_cents, receiptUrl }) => {
    const items = [
      ...lines.map((line) => ({
        title: `${line.name}${line.size ? `, talle ${line.size}` : ''}`,
        quantity: line.qty,
        unit_price: centsToAmount(line.unit_price_cents),
        external_code: line.slug.slice(0, 30),
      })),
      // El total tiene que ser la suma de los ítems: el envío va como uno más.
      ...(shipping_cents > 0 ? [{ title: 'Envío', quantity: 1, unit_price: centsToAmount(shipping_cents), external_code: 'envio' }] : []),
    ]
    const sum = lines.reduce((s, l) => s + l.qty * l.unit_price_cents, 0) + shipping_cents
    if (sum !== total_cents) throw new Error(`Los ítems suman ${sum} y el pedido ${total_cents}: no se crea el cobro.`)

    const body = JSON.stringify({
      type: 'online',
      processing_mode: 'manual',
      external_reference: orderId,
      total_amount: centsToAmount(total_cents),
      payer: { email: payerEmail },
      items,
      config: {
        statement_descriptor: 'HILO',
        // Efectivo (Rapipago, Pago Fácil): Mercado Pago pide al menos 3 días.
        default_payment_due_date: 'P3D',
        online: { success_url: receiptUrl, failure_url: receiptUrl, pending_url: receiptUrl, auto_return: 'approved' },
      },
    })

    const create = (idempotencyKey: string) => doFetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.mpAccessToken}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': idempotencyKey },
      body,
    })

    let response = await create(orderId)
    if (response.status === 409) response = await create(`${orderId}:${randomUUID()}`)
    const data = await response.json().catch(() => null) as { id?: unknown; checkout_url?: unknown } | null
    if (!response.ok || typeof data?.id !== 'string' || typeof data.checkout_url !== 'string') {
      throw new Error(`Mercado Pago no creó la orden (HTTP ${response.status}).`)
    }
    return { checkoutId: data.id, url: data.checkout_url }
  }
}

type MpOrder = {
  id?: string
  external_reference?: string
  total_amount?: unknown
  currency?: string
  status?: string
  status_detail?: string
  transactions?: { payments?: { id?: string }[] }
}

/** Estado de la orden de Mercado Pago en el idioma de confirm_order_payment. */
function paymentStatus({ status, status_detail }: MpOrder): string | null {
  if (status === 'processed') {
    if (status_detail === 'accredited') return 'approved'
    if (status_detail === 'refunded' || status_detail === 'partially_refunded') return 'refunded'
  }
  return ({
    refunded: 'refunded',
    charged_back: 'charged_back',
    failed: 'rejected',
    canceled: 'cancelled',
    expired: 'cancelled',
    processing: 'in_process',
    action_required: 'pending',
  } as Record<string, string>)[status ?? ''] ?? null
}

/**
 * Lee una orden de Mercado Pago y la traduce a PaymentInfo. Devuelve null si no existe,
 * si todavía no tiene ningún intento de pago (recién creada) o si no se puede leer el
 * importe: en esos casos no hay nada que aplicar al pedido.
 */
export async function fetchMercadoPagoPayment(config: MpConfig, mpOrderId: string, doFetch: typeof fetch = fetch): Promise<PaymentInfo | null> {
  // Ids tipo ORD01J... / ORDTST01...: nada que pueda escaparse de la ruta.
  if (!/^[A-Za-z0-9]{1,64}$/.test(mpOrderId)) return null
  const response = await doFetch(`${API}/${mpOrderId}`, { headers: { Authorization: `Bearer ${config.mpAccessToken}` } })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Mercado Pago no devolvió la orden ${mpOrderId} (HTTP ${response.status}).`)
  const order = await response.json() as MpOrder
  const status = paymentStatus(order)
  const amount_cents = amountToCents(order.total_amount)
  if (!status || amount_cents === null) return null
  const payments = order.transactions?.payments ?? []
  return {
    // El intento vigente es el último pago de la orden; sin pagos, la orden misma.
    id: payments.at(-1)?.id ?? order.id ?? mpOrderId,
    status,
    orderId: order.external_reference ?? null,
    amount_cents,
    currency: order.currency ?? '',
  }
}
