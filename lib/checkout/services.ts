import 'server-only'
import { after } from 'next/server'
import { fetchMercadoPagoPayment } from '../mercadopago.ts'
import { resendMailer } from '../resend.ts'
import { sendOrderConfirmation, syncPayment } from './payment-sync.ts'
import { receiptToken } from './receipt-token.ts'
import type { CheckoutConfig } from './server-config.ts'
import { adminClient, confirmPayment, loadReceiptOrder, markEmailSent } from './supabase-store.ts'

/** Lo que comparten el recibo y la notificación de Mercado Pago, armado desde la configuración. */
export function checkoutServices(config: CheckoutConfig) {
  const db = adminClient(config.supabaseUrl, config.serviceRoleKey)
  const mailer = config.resend ? resendMailer(config.resend) : null
  const receiptUrl = (orderId: string) => `${config.siteUrl}/pedido/${orderId}?t=${receiptToken(config.receiptSecret, orderId)}`

  const sendConfirmation = (orderId: string) => sendOrderConfirmation({
    loadOrder: (id) => loadReceiptOrder(db, id),
    markEmailSent: (id) => markEmailSent(db, id),
    receiptUrl,
    mailer,
  }, orderId)

  return {
    db,
    receiptUrl,
    /**
     * Relee el cobro en Mercado Pago y lo aplica al pedido. El correo sale después de
     * responder (after), para no demorar la notificación ni el recibo; si falla, el
     * próximo aviso o la próxima visita lo reintentan.
     */
    sync: (mercadoPagoId: string, expectedOrderId?: string) => syncPayment({
      getPayment: (id) => fetchMercadoPagoPayment(config, id),
      confirm: (orderId, payment) => confirmPayment(db, orderId, payment),
      sendConfirmation: async (orderId) => {
        after(() => sendConfirmation(orderId).catch((error) => {
          console.error('Error enviando el correo del pedido', orderId, error)
        }))
      },
    }, mercadoPagoId, expectedOrderId),
    sendConfirmation,
  }
}
