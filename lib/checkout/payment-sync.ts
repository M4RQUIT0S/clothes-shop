import type { Mailer } from '../resend.ts'
import { orderConfirmationEmail, type EmailOrder } from './order-email.ts'

/** Un pago tal como lo devuelve la API de Mercado Pago, ya traducido a centavos. */
export type PaymentInfo = {
  id: string
  status: string
  /** external_reference: el id del pedido que la tienda le puso al crear el cobro. */
  orderId: string | null
  amount_cents: number
  currency: string
}

export type PaymentSyncDeps = {
  getPayment: (paymentId: string) => Promise<PaymentInfo | null>
  /** confirm_order_payment en la base: devuelve el estado en que queda el pedido. */
  confirm: (orderId: string, payment: PaymentInfo) => Promise<string>
  sendConfirmation: (orderId: string) => Promise<unknown>
}

export type SyncOutcome =
  | { outcome: 'synced'; orderId: string; status: string }
  | { outcome: 'payment_not_found' | 'unrelated' | 'mismatch' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Lleva el estado de un pago al pedido. Lo usan la notificación de Mercado Pago y la
 * vuelta del comprador al recibo: en ambos casos el pago se relee de la API, nunca se
 * cree lo que diga la petición. `expectedOrderId` evita que el payment_id de otro
 * pedido, pegado en la URL de un recibo, toque este.
 */
export async function syncPayment(deps: PaymentSyncDeps, paymentId: string, expectedOrderId?: string): Promise<SyncOutcome> {
  const payment = await deps.getPayment(paymentId)
  if (!payment) return { outcome: 'payment_not_found' }
  if (!payment.orderId || !UUID.test(payment.orderId)) return { outcome: 'unrelated' }
  if (expectedOrderId && payment.orderId !== expectedOrderId) return { outcome: 'mismatch' }

  const status = await deps.confirm(payment.orderId, payment)
  if (status === 'paid') {
    // El correo nunca hace fallar la confirmación del pago: si falla, el próximo aviso
    // o la próxima visita al recibo lo reintentan (sendOrderConfirmation es idempotente).
    await deps.sendConfirmation(payment.orderId).catch((error) => {
      console.error('No se pudo enviar el correo del pedido', payment.orderId, error)
    })
  }
  return { outcome: 'synced', orderId: payment.orderId, status }
}

export type ConfirmationDeps = {
  loadOrder: (orderId: string) => Promise<(EmailOrder & { status: string; email_sent_at: string | null }) | null>
  markEmailSent: (orderId: string) => Promise<void>
  receiptUrl: (orderId: string) => string
  mailer: Mailer | null
}

/**
 * Correo de pago recibido, una sola vez por pedido: la clave de idempotencia evita el
 * duplicado entre avisos simultáneos y email_sent_at, pasadas las 24 h de Resend.
 */
export async function sendOrderConfirmation(deps: ConfirmationDeps, orderId: string) {
  const order = await deps.loadOrder(orderId)
  if (!order) return 'not_found'
  if (order.status !== 'paid') return 'not_paid'
  if (order.email_sent_at) return 'already_sent'
  if (!deps.mailer) return 'not_configured'

  const message = orderConfirmationEmail(order, deps.receiptUrl(orderId))
  const result = await deps.mailer({ ...message, idempotencyKey: `order-confirmation/${orderId}` })
  if (!result.ok) {
    console.error('Resend rechazó el correo del pedido', orderId, result.error)
    return 'failed'
  }
  await deps.markEmailSent(orderId)
  return 'sent'
}
