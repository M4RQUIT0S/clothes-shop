import assert from 'node:assert/strict'
import test from 'node:test'
import { orderConfirmationEmail } from '../lib/checkout/order-email.ts'
import { resendMailer } from '../lib/resend.ts'
import { formatPrice } from '../lib/shop.ts'

const order = {
  id: '6f1c2e0a-1b2c-4d5e-8f90-123456789abc',
  full_name: 'Ana <script>alert(1)</script>',
  email: 'ana@example.org',
  items: [{ slug: 'remera', name: 'Remera & más', size: 'M', qty: 2, unit_price_cents: 1_000_000 }],
  subtotal_cents: 2_000_000,
  shipping_cents: 890_000,
  total_cents: 2_890_000,
}
const receiptUrl = 'https://tienda.example/pedido/6f1c2e0a-1b2c-4d5e-8f90-123456789abc?t=abc'

test('el correo sale sólo del pedido guardado: el mismo pedido da el mismo correo', () => {
  assert.deepEqual(orderConfirmationEmail(order, receiptUrl), orderConfirmationEmail(order, receiptUrl))
})

test('el correo lleva referencia completa, líneas, importes y el enlace al recibo', () => {
  const { to, subject, text, html } = orderConfirmationEmail(order, receiptUrl)
  assert.equal(to, order.email)
  assert.match(subject, /6F1C2E0A/i)
  for (const body of [text, html]) {
    assert.ok(body.includes(order.id))
    assert.ok(body.includes(formatPrice(order.total_cents)), 'total')
    assert.ok(body.includes(formatPrice(order.shipping_cents)), 'envío')
    assert.ok(body.includes('talle M'))
  }
  assert.ok(text.includes(receiptUrl))
  assert.ok(html.includes(receiptUrl.replace('&', '&amp;')))
})

test('lo que escribió el comprador no se interpreta como HTML', () => {
  const { html } = orderConfirmationEmail(order, receiptUrl)
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('Remera &amp; más'))
})

function fakeFetch(status: number, body: string, seen: { url?: string; init?: RequestInit }[] = []) {
  return async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), init })
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } })
  }
}

test('Resend recibe autenticación, User-Agent, JSON y la clave de idempotencia', async () => {
  const seen: { url?: string; init?: RequestInit }[] = []
  const send = resendMailer({ apiKey: 're_test', from: 'Hilo <onboarding@resend.dev>', fetch: fakeFetch(200, '{"id":"e-1"}', seen) })
  const result = await send({ to: 'a@b.ar', subject: 'S', html: '<p>h</p>', text: 't', idempotencyKey: 'order-confirmation/1' })
  assert.deepEqual(result, { ok: true, id: 'e-1' })
  assert.equal(seen[0].url, 'https://api.resend.com/emails')
  const headers = new Headers(seen[0].init?.headers)
  assert.equal(headers.get('authorization'), 'Bearer re_test')
  assert.equal(headers.get('content-type'), 'application/json')
  assert.equal(headers.get('idempotency-key'), 'order-confirmation/1')
  assert.ok(headers.get('user-agent'))
  assert.deepEqual(JSON.parse(String(seen[0].init?.body)), {
    from: 'Hilo <onboarding@resend.dev>', to: 'a@b.ar', subject: 'S', html: '<p>h</p>', text: 't',
  })
})

test('un error de Resend vuelve como resultado, con o sin cuerpo JSON, y dice si conviene reintentar', async () => {
  const msg = { to: 'a@b.ar', subject: 'S', html: 'h', text: 't', idempotencyKey: 'k' }
  const rejected = await resendMailer({ apiKey: 'k', from: 'f', fetch: fakeFetch(403, '{"name":"validation_error","message":"domain is not verified"}') })(msg)
  assert.deepEqual(rejected, { ok: false, retryable: false, error: 'validation_error: domain is not verified' })
  const limited = await resendMailer({ apiKey: 'k', from: 'f', fetch: fakeFetch(429, '{"name":"rate_limit_exceeded","message":"slow"}') })(msg)
  assert.equal(limited.ok === false && limited.retryable, true)
  const proxy = await resendMailer({ apiKey: 'k', from: 'f', fetch: fakeFetch(502, '<html>bad gateway</html>') })(msg)
  assert.deepEqual(proxy, { ok: false, retryable: true, error: 'HTTP 502' })
  const offline = await resendMailer({ apiKey: 'k', from: 'f', fetch: async () => { throw new TypeError('fetch failed') } })(msg)
  assert.deepEqual(offline, { ok: false, retryable: true, error: 'fetch failed' })
})
