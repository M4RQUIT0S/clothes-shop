// Orquestación del pedido con dobles en memoria: sin red, sin base y sin cobros.
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  placeOrder, type CheckoutGateway, type NewOrderRow, type OrderStore, type StoredOrder,
} from '../lib/checkout/place-order.ts'
import { buildQuote, quoteFingerprint, type QuoteProduct } from '../lib/checkout/quote.ts'
import { verifyReceiptToken } from '../lib/checkout/receipt-token.ts'

const SECRET = 's'.repeat(32)
const SITE = 'https://tienda.example'

const remera: QuoteProduct = {
  slug: 'remera', name: 'Remera', price_cents: 1_000_000, sale_price_cents: null,
  sizes: ['M', 'L'], variants: [{ size: 'M', stock: 5 }, { size: 'L', stock: 0 }],
}

function memoryStore(catalog: QuoteProduct[]) {
  const rows: (NewOrderRow & { payment_url: string | null; mp_order_id: string | null })[] = []
  const calls = { inserts: 0, catalogReads: 0 }
  const store: OrderStore & { rows: typeof rows; calls: typeof calls; failInsert?: boolean; raceOnInsert?: NewOrderRow } = {
    rows, calls,
    async loadCatalog() { calls.catalogReads++; return catalog },
    async findByIdempotencyKey(key) {
      const row = rows.find((r) => r.idempotency_key === key)
      return row ? toStored(row) : null
    },
    async insert(row) {
      calls.inserts++
      if (store.failInsert) throw new Error('db down')
      if (store.raceOnInsert) {
        // Otra petición con la misma clave ganó la carrera justo antes.
        rows.push({ ...store.raceOnInsert, payment_url: 'https://pago/ganador', mp_order_id: 'pref-ganador' })
        store.raceOnInsert = undefined
      }
      if (rows.some((r) => r.idempotency_key === row.idempotency_key)) return 'duplicate_key'
      rows.push({ ...row, payment_url: null, mp_order_id: null })
      return 'inserted'
    },
    async savePayment(orderId, { checkoutId, url }) {
      const row = rows.find((r) => r.id === orderId)!
      row.mp_order_id = checkoutId
      row.payment_url = url
    },
  }
  return store
}

const toStored = (row: NewOrderRow & { payment_url: string | null }): StoredOrder => ({
  id: row.id, request_hash: row.request_hash, status: row.status, total_cents: row.total_cents,
  payment_url: row.payment_url, email: row.email,
  items: row.items, shipping_cents: row.shipping_cents,
})

function gateway(fail = 0) {
  const calls: Parameters<CheckoutGateway>[0][] = []
  let failures = fail
  const create: CheckoutGateway = async (order) => {
    calls.push(order)
    if (failures-- > 0) throw new Error('mercado pago caído')
    return { checkoutId: `pref-${calls.length}`, url: `https://pago/${order.orderId}` }
  }
  return Object.assign(create, { calls })
}

const KEY = '0b3f6a52-8f0e-4d64-9a59-0f5d4c3b2a10'
const items = [{ slug: 'remera', size: 'M', qty: 2 }]
const accepted = quoteFingerprint(buildQuote([remera], items).quote)
const input = {
  full_name: 'Ana Pérez', email: 'ana@example.org', address: 'Mitre 123', province: 'Buenos Aires',
  postal_code: '1425', items, accepted_fingerprint: accepted, idempotency_key: KEY,
}
const deps = (store: OrderStore, createCheckout: CheckoutGateway) =>
  ({ store, createCheckout, receiptSecret: SECRET, siteUrl: SITE, newId: () => 'a8c0e8a4-4d1d-4f0a-9d47-6f3a5b2c1d00' })

test('registra el pedido una vez, con los importes del servidor, y devuelve pago y recibo', async () => {
  const store = memoryStore([remera])
  const pay = gateway()
  const result = await placeOrder(deps(store, pay), input)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(store.rows.length, 1)
  const row = store.rows[0]
  assert.equal(row.status, 'awaiting_payment')
  assert.equal(row.idempotency_key, KEY)
  assert.deepEqual([row.subtotal_cents, row.total_cents], [2_000_000, 2_000_000 + row.shipping_cents])
  assert.deepEqual(row.items, [{ slug: 'remera', name: 'Remera', size: 'M', qty: 2, unit_price_cents: 1_000_000 }])
  assert.equal(result.paymentUrl, `https://pago/${row.id}`)
  const url = new URL(result.receiptUrl)
  assert.equal(url.origin + url.pathname, `${SITE}/pedido/${row.id}`)
  assert.equal(verifyReceiptToken(SECRET, row.id, url.searchParams.get('t')), true)
  // La pasarela recibe la referencia del pedido y la vuelta al recibo, no datos del navegador.
  assert.equal(pay.calls[0].orderId, row.id)
  assert.equal(pay.calls[0].receiptUrl, result.receiptUrl)
  assert.equal(pay.calls[0].total_cents, row.total_cents)
})

test('reenviar la misma clave con el mismo contenido devuelve el mismo pedido sin duplicarlo', async () => {
  const store = memoryStore([remera])
  const pay = gateway()
  const first = await placeOrder(deps(store, pay), input)
  const again = await placeOrder(deps(store, pay), input)
  assert.deepEqual(again, first)
  assert.equal(store.rows.length, 1)
  assert.equal(pay.calls.length, 1)
})

test('el reintento devuelve el pedido original aunque el precio haya cambiado después', async () => {
  const store = memoryStore([remera])
  const first = await placeOrder(deps(store, gateway()), input)
  const cheaper = memoryStore([{ ...remera, sale_price_cents: 500_000 }])
  cheaper.rows.push(...store.rows)
  const again = await placeOrder(deps(cheaper, gateway()), input)
  assert.deepEqual(again, first)
})

test('si la pasarela falla, el pedido queda y el reintento con la misma clave completa el pago', async () => {
  const store = memoryStore([remera])
  const pay = gateway(1)
  const failed = await placeOrder(deps(store, pay), input)
  assert.equal(failed.ok, false)
  assert.equal(!failed.ok && failed.code, 'PAYMENT_UNAVAILABLE')
  assert.equal(store.rows.length, 1)
  const retried = await placeOrder(deps(store, pay), input)
  assert.equal(retried.ok, true)
  assert.equal(store.rows.length, 1)
  assert.equal(pay.calls.length, 2)
  assert.equal(pay.calls[1].orderId, store.rows[0].id)
})

test('la misma clave con otro contenido se rechaza y no devuelve el pedido ajeno', async () => {
  const store = memoryStore([remera])
  await placeOrder(deps(store, gateway()), input)
  const other = await placeOrder(deps(store, gateway()), { ...input, address: 'Otra 456' })
  assert.deepEqual(other.ok === false && other.code, 'IDEMPOTENCY_CONFLICT')
  assert.equal('orderId' in other, false)
  assert.equal(store.rows.length, 1)
})

test('dos peticiones simultáneas con la misma clave terminan en un solo pedido', async () => {
  const store = memoryStore([remera])
  const winner: NewOrderRow = {
    id: 'f0f0f0f0-0000-4000-8000-000000000001', idempotency_key: KEY, request_hash: '',
    status: 'awaiting_payment', full_name: '', email: 'ana@example.org', address: '', province: '', postal_code: '',
    items: [], subtotal_cents: 0, shipping_cents: 0, total_cents: 0,
  }
  // El ganador guardó el mismo contenido: se calcula su huella con una pasada previa.
  const probe = memoryStore([remera])
  await placeOrder(deps(probe, gateway()), input)
  store.raceOnInsert = { ...winner, request_hash: probe.rows[0].request_hash }
  const pay = gateway()
  const result = await placeOrder(deps(store, pay), input)
  assert.equal(store.rows.length, 1)
  assert.equal(result.ok && result.orderId, winner.id)
  assert.equal(result.ok && result.paymentUrl, 'https://pago/ganador')
  assert.equal(pay.calls.length, 0)
})

test('si el total cambió desde que lo vio, devuelve la cotización nueva y no inserta', async () => {
  const store = memoryStore([{ ...remera, sale_price_cents: 900_000 }])
  const result = await placeOrder(deps(store, gateway()), input)
  assert.equal(result.ok === false && result.code, 'QUOTE_CHANGED')
  if (result.ok || result.code !== 'QUOTE_CHANGED') return
  assert.equal(result.quote.subtotal_cents, 1_800_000)
  assert.equal(result.fingerprint, quoteFingerprint(result.quote))
  assert.equal(store.calls.inserts, 0)
})

test('talle inexistente, agotado o sin unidades suficientes: detalle por línea y sin pedido', async () => {
  const store = memoryStore([remera])
  const bad = [{ slug: 'remera', size: 'L', qty: 1 }, { slug: 'remera', size: 'M', qty: 9 }, { slug: 'remera', size: 'XS', qty: 1 }]
  const result = await placeOrder(deps(store, gateway()), { ...input, items: bad })
  assert.equal(result.ok === false && result.code, 'UNAVAILABLE')
  if (result.ok || result.code !== 'UNAVAILABLE') return
  assert.deepEqual(result.problems.map((p) => p.reason), ['sold_out', 'insufficient', 'size_not_sold'])
  assert.equal(store.calls.inserts, 0)
})

test('datos inválidos se rechazan antes de tocar la base', async () => {
  const store = memoryStore([remera])
  for (const broken of [{ ...input, idempotency_key: 'no-es-uuid' }, { ...input, email: 'x' }, { ...input, items: [] }]) {
    const result = await placeOrder(deps(store, gateway()), broken)
    assert.equal(result.ok === false && result.code, 'INVALID')
  }
  assert.deepEqual(store.calls, { inserts: 0, catalogReads: 0 })
})

test('si la base falla al insertar, no se crea el pago', async () => {
  const store = memoryStore([remera])
  store.failInsert = true
  const pay = gateway()
  const result = await placeOrder(deps(store, pay), input)
  assert.equal(result.ok === false && result.code, 'ERROR')
  assert.equal(pay.calls.length, 0)
})
