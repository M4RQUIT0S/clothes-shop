// Cliente de la API de Órdenes de Mercado Pago (Checkout Pro) con fetch falso: sin red.
import assert from 'node:assert/strict'
import test from 'node:test'
import { amountToCents, centsToAmount, fetchMercadoPagoPayment, mercadoPagoCheckout } from '../lib/mercadopago.ts'

test('los importes viajan como texto con dos decimales y vuelven a centavos sin flotantes', () => {
  assert.equal(centsToAmount(2_890_000), '28900.00')
  assert.equal(centsToAmount(5), '0.05')
  assert.equal(centsToAmount(0), '0.00')
  assert.equal(amountToCents('28900.00'), 2_890_000)
  assert.equal(amountToCents('28900'), 2_890_000)
  assert.equal(amountToCents('0.1'), 10)
  for (const bad of ['', '1.234', '-1.00', '1e3', 'abc', '1,00', null, 12]) assert.equal(amountToCents(bad), null, String(bad))
})

const config = { mpAccessToken: 'APP_USR-test' }
const ORDER = '6f1c2e0a-1b2c-4d5e-8f90-123456789abc'
const checkoutInput = {
  orderId: ORDER,
  payerEmail: 'comprador@testuser.com',
  lines: [
    { slug: 'remera', name: 'Remera', size: 'M', qty: 2, unit_price_cents: 1_000_000 },
    { slug: 'bufanda', name: 'Bufanda', size: '', qty: 1, unit_price_cents: 500_000 },
  ],
  shipping_cents: 890_000,
  total_cents: 3_390_000,
  receiptUrl: `https://tienda.example/pedido/${ORDER}?t=abc`,
}

function mpFetch(responses: { status: number; body: unknown }[]) {
  const calls: { url: string; init?: RequestInit }[] = []
  const doFetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    const next = responses.shift() ?? { status: 500, body: {} }
    return new Response(JSON.stringify(next.body), { status: next.status, headers: { 'Content-Type': 'application/json' } })
  }
  return Object.assign(doFetch, { calls })
}

type Item = { title: string; quantity: number; unit_price: string }

test('crea la orden de Checkout Pro con la referencia del pedido como clave de idempotencia', async () => {
  const doFetch = mpFetch([{ status: 201, body: { id: 'ORDTST01ABC', checkout_url: 'https://www.mercadopago.com.ar/checkout/v1/redirect?order_id=ORDTST01ABC' } }])
  const result = await mercadoPagoCheckout(config, doFetch)(checkoutInput)
  assert.deepEqual(result, { checkoutId: 'ORDTST01ABC', url: 'https://www.mercadopago.com.ar/checkout/v1/redirect?order_id=ORDTST01ABC' })
  const { url, init } = doFetch.calls[0]
  assert.equal(url, 'https://api.mercadopago.com/v1/orders')
  assert.equal(init?.method, 'POST')
  const headers = new Headers(init?.headers)
  assert.equal(headers.get('authorization'), 'Bearer APP_USR-test')
  assert.equal(headers.get('x-idempotency-key'), ORDER)
  const body = JSON.parse(String(init?.body))
  assert.equal(body.type, 'online')
  assert.equal(body.processing_mode, 'manual')
  assert.equal(body.external_reference, ORDER)
  assert.equal(body.total_amount, '33900.00')
  assert.equal(body.payer.email, 'comprador@testuser.com')
  assert.deepEqual(body.items.map((i: Item) => [i.title, i.quantity, i.unit_price]), [
    ['Remera, talle M', 2, '10000.00'],
    ['Bufanda', 1, '5000.00'],
    ['Envío', 1, '8900.00'],
  ])
  // Mercado Pago exige que los ítems sumen exactamente el total.
  const sum = body.items.reduce((s: number, i: Item) => s + i.quantity * amountToCents(i.unit_price)!, 0)
  assert.equal(sum, checkoutInput.total_cents)
  for (const key of ['success_url', 'failure_url', 'pending_url']) assert.equal(body.config.online[key], checkoutInput.receiptUrl)
  assert.equal(body.config.online.auto_return, 'approved')
})

test('sin envío no se agrega un ítem de envío en cero', async () => {
  const doFetch = mpFetch([{ status: 201, body: { id: 'ORD1', checkout_url: 'https://mp/1' } }])
  await mercadoPagoCheckout(config, doFetch)({ ...checkoutInput, shipping_cents: 0, total_cents: 2_500_000 })
  const body = JSON.parse(String(doFetch.calls[0].init?.body))
  assert.equal(body.items.length, 2)
})

test('si los ítems no suman el total, no se manda nada a Mercado Pago', async () => {
  const doFetch = mpFetch([])
  await assert.rejects(mercadoPagoCheckout(config, doFetch)({ ...checkoutInput, total_cents: 1 }))
  assert.equal(doFetch.calls.length, 0)
})

test('si la clave ya se usó (respuesta perdida), crea con una clave nueva en vez de fallar para siempre', async () => {
  const doFetch = mpFetch([
    { status: 409, body: { errors: [{ code: 'idempotency_key_already_used' }] } },
    { status: 201, body: { id: 'ORD2', checkout_url: 'https://mp/2' } },
  ])
  const result = await mercadoPagoCheckout(config, doFetch)(checkoutInput)
  assert.equal(result.checkoutId, 'ORD2')
  const keys = doFetch.calls.map((c) => new Headers(c.init?.headers).get('x-idempotency-key'))
  assert.equal(keys[0], ORDER)
  assert.notEqual(keys[1], ORDER)
  assert.ok(keys[1]!.startsWith(ORDER) && keys[1]!.length <= 128)
})

test('errores de Mercado Pago o respuestas sin enlace de pago se informan como fallo', async () => {
  const failures = [
    [{ status: 500, body: {} }],
    [{ status: 423, body: {} }],
    [{ status: 201, body: { id: 'ORD3' } }],
    [{ status: 400, body: { errors: [] } }],
    [{ status: 409, body: {} }, { status: 409, body: {} }],
  ]
  for (const responses of failures) {
    await assert.rejects(mercadoPagoCheckout(config, mpFetch(responses))(checkoutInput), JSON.stringify(responses))
  }
})

const mpOrder = (over: Record<string, unknown> = {}) => ({
  id: 'ORD9', external_reference: ORDER, total_amount: '33900.00', currency: 'ARS',
  status: 'processed', status_detail: 'accredited',
  transactions: { payments: [{ id: 'PAY01', status: 'failed' }, { id: 'PAY02', status: 'processed' }] },
  ...over,
})

test('lee la orden de Mercado Pago y la traduce al estado de pago que entiende la base', async () => {
  const cases: [Record<string, unknown>, string][] = [
    [{}, 'approved'],
    [{ status: 'processed', status_detail: 'refunded' }, 'refunded'],
    [{ status: 'processed', status_detail: 'partially_refunded' }, 'refunded'],
    [{ status: 'refunded', status_detail: 'refunded' }, 'refunded'],
    [{ status: 'charged_back', status_detail: 'in_process' }, 'charged_back'],
    [{ status: 'failed', status_detail: 'rejected_by_issuer' }, 'rejected'],
    [{ status: 'canceled', status_detail: 'canceled' }, 'cancelled'],
    [{ status: 'expired', status_detail: 'expired' }, 'cancelled'],
    [{ status: 'processing', status_detail: 'in_process' }, 'in_process'],
    [{ status: 'action_required', status_detail: 'waiting_payment' }, 'pending'],
  ]
  for (const [over, expected] of cases) {
    const info = await fetchMercadoPagoPayment(config, 'ORD9', mpFetch([{ status: 200, body: mpOrder(over) }]))
    assert.equal(info?.status, expected, JSON.stringify(over))
  }
  const doFetch = mpFetch([{ status: 200, body: mpOrder() }])
  const info = await fetchMercadoPagoPayment(config, 'ORD9', doFetch)
  assert.deepEqual(info, { id: 'PAY02', status: 'approved', orderId: ORDER, amount_cents: 3_390_000, currency: 'ARS' })
  assert.equal(doFetch.calls[0].url, 'https://api.mercadopago.com/v1/orders/ORD9')
  assert.equal(new Headers(doFetch.calls[0].init?.headers).get('authorization'), 'Bearer APP_USR-test')
})

test('sin pagos registrados, el intento se identifica con la orden', async () => {
  const info = await fetchMercadoPagoPayment(config, 'ORD9', mpFetch([{ status: 200, body: mpOrder({ status: 'canceled', status_detail: 'canceled', transactions: {} }) }]))
  assert.equal(info?.id, 'ORD9')
})

test('una orden recién creada, inexistente o con importe ilegible no es un pago', async () => {
  const created = mpOrder({ status: 'created', status_detail: 'created', transactions: { payments: [] } })
  assert.equal(await fetchMercadoPagoPayment(config, 'ORD9', mpFetch([{ status: 200, body: created }])), null)
  assert.equal(await fetchMercadoPagoPayment(config, 'ORD9', mpFetch([{ status: 404, body: {} }])), null)
  assert.equal(await fetchMercadoPagoPayment(config, 'ORD9', mpFetch([{ status: 200, body: mpOrder({ total_amount: 33900 }) }])), null)
  await assert.rejects(fetchMercadoPagoPayment(config, 'ORD9', mpFetch([{ status: 500, body: {} }])))
  // Un id que no tiene forma de orden de Mercado Pago no se manda a su API.
  const doFetch = mpFetch([])
  assert.equal(await fetchMercadoPagoPayment(config, '../v1/payments', doFetch), null)
  assert.equal(doFetch.calls.length, 0)
})
