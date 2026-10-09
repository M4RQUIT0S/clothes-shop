import assert from 'node:assert/strict'
import test from 'node:test'
import { sendOrderConfirmation, syncPayment, type PaymentInfo } from '../lib/checkout/payment-sync.ts'
import type { MailMessage } from '../lib/resend.ts'

const ORDER = '6f1c2e0a-1b2c-4d5e-8f90-123456789abc'
const approved: PaymentInfo = { id: '123', status: 'approved', orderId: ORDER, amount_cents: 2_890_000, currency: 'ARS' }

function deps(payment: PaymentInfo | null, resultStatus = 'paid') {
  const confirmed: [string, PaymentInfo][] = []
  const emailed: string[] = []
  return {
    confirmed, emailed,
    getPayment: async () => payment,
    confirm: async (orderId: string, p: PaymentInfo) => { confirmed.push([orderId, p]); return resultStatus },
    sendConfirmation: async (orderId: string) => { emailed.push(orderId) },
  }
}

test('un pago aprobado se aplica a su pedido y dispara el correo', async () => {
  const d = deps(approved)
  assert.deepEqual(await syncPayment(d, '123'), { outcome: 'synced', orderId: ORDER, status: 'paid' })
  assert.deepEqual(d.confirmed, [[ORDER, approved]])
  assert.deepEqual(d.emailed, [ORDER])
})

test('un pago que no queda pagado no manda correo', async () => {
  for (const status of ['awaiting_payment', 'payment_failed', 'needs_review']) {
    const d = deps({ ...approved, status: 'rejected' }, status)
    await syncPayment(d, '123')
    assert.deepEqual(d.emailed, [], status)
  }
})

test('pagos inexistentes, ajenos a la tienda o de otro pedido no tocan nada', async () => {
  const missing = deps(null)
  assert.deepEqual(await syncPayment(missing, '1'), { outcome: 'payment_not_found' })
  for (const orderId of [null, '', 'pedido-123', `${ORDER}x`]) {
    const foreign = deps({ ...approved, orderId })
    assert.deepEqual(await syncPayment(foreign, '1'), { outcome: 'unrelated' })
    assert.equal(foreign.confirmed.length, 0)
  }
  // Al volver al recibo de un pedido, un payment_id de otro pedido no lo modifica.
  const other = deps(approved)
  assert.deepEqual(await syncPayment(other, '1', '00000000-0000-4000-8000-000000000000'), { outcome: 'mismatch' })
  assert.equal(other.confirmed.length, 0)
})

test('si el correo falla, la sincronización del pago no falla', async () => {
  const d = { ...deps(approved), sendConfirmation: async () => { throw new Error('resend caído') } }
  assert.deepEqual(await syncPayment(d, '123'), { outcome: 'synced', orderId: ORDER, status: 'paid' })
})

const paidOrder = {
  id: ORDER, status: 'paid', email_sent_at: null as string | null, full_name: 'Ana', email: 'ana@example.org',
  items: [{ slug: 'remera', name: 'Remera', size: 'M', qty: 1, unit_price_cents: 2_000_000 }],
  subtotal_cents: 2_000_000, shipping_cents: 890_000, total_cents: 2_890_000,
}

function mailDeps(order: typeof paidOrder | null, mailOk = true) {
  const sent: MailMessage[] = []
  const marked: string[] = []
  return {
    sent, marked,
    loadOrder: async () => order,
    markEmailSent: async (id: string) => { marked.push(id) },
    receiptUrl: (id: string) => `https://tienda.example/pedido/${id}?t=x`,
    mailer: async (m: MailMessage) => {
      sent.push(m)
      return mailOk ? { ok: true as const, id: 'e1' } : { ok: false as const, error: 'x', retryable: true }
    },
  }
}

test('el correo de pago se manda una vez, con clave de idempotencia por pedido', async () => {
  const d = mailDeps(paidOrder)
  assert.equal(await sendOrderConfirmation(d, ORDER), 'sent')
  assert.equal(d.sent[0].idempotencyKey, `order-confirmation/${ORDER}`)
  assert.equal(d.sent[0].to, 'ana@example.org')
  assert.deepEqual(d.marked, [ORDER])
  const again = mailDeps({ ...paidOrder, email_sent_at: '2026-10-09T12:00:00Z' })
  assert.equal(await sendOrderConfirmation(again, ORDER), 'already_sent')
  assert.equal(again.sent.length, 0)
})

test('sin pedido pagado, sin proveedor o con fallo, no se marca como enviado', async () => {
  assert.equal(await sendOrderConfirmation(mailDeps(null), ORDER), 'not_found')
  const unpaid = mailDeps({ ...paidOrder, status: 'awaiting_payment' })
  assert.equal(await sendOrderConfirmation(unpaid, ORDER), 'not_paid')
  assert.equal(unpaid.sent.length, 0)
  const noMailer = { ...mailDeps(paidOrder), mailer: null }
  assert.equal(await sendOrderConfirmation(noMailer, ORDER), 'not_configured')
  const failing = mailDeps(paidOrder, false)
  assert.equal(await sendOrderConfirmation(failing, ORDER), 'failed')
  assert.deepEqual(failing.marked, [])
})
