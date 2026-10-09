import { formatPrice } from '../shop.ts'

export type EmailOrder = {
  id: string
  full_name: string
  email: string
  items: { name: string; size: string; qty: number; unit_price_cents: number }[]
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * Correo de pago recibido. Sale sólo del pedido guardado, sin fechas ni nada que
 * cambie entre envíos: Resend compara el cuerpo al reutilizar la clave de
 * idempotencia, y un reintento con otro cuerpo se rechazaría en vez de deduplicarse.
 */
export function orderConfirmationEmail(order: EmailOrder, receiptUrl: string) {
  const reference = order.id.slice(0, 8).toUpperCase()
  const lines = order.items.map((item) => ({
    label: `${item.name}${item.size ? `, talle ${item.size}` : ''} × ${item.qty}`,
    amount: formatPrice(item.qty * item.unit_price_cents),
  }))
  const totals = [
    ['Subtotal', formatPrice(order.subtotal_cents)],
    ['Envío', order.shipping_cents === 0 ? 'Gratis' : formatPrice(order.shipping_cents)],
    ['Total pagado', formatPrice(order.total_cents)],
  ]

  const text = [
    `Hola, ${order.full_name}:`,
    '',
    'Recibimos el pago de tu pedido. Lo preparamos y te avisamos cuando salga.',
    '',
    ...lines.map((l) => `${l.label}: ${l.amount}`),
    '',
    ...totals.map(([label, value]) => `${label}: ${value}`),
    '',
    `Referencia: ${order.id}`,
    `Recibo: ${receiptUrl}`,
    '',
    'Hilo — ropa de todos los días',
  ].join('\n')

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 16px 4px 0">${escapeHtml(label)}</td><td style="padding:4px 0;text-align:right">${escapeHtml(value)}</td></tr>`

  const html = `<!doctype html>
<html lang="es-AR"><body style="font-family:Georgia,serif;color:#33301f;background:#fbf8f5;padding:24px">
<p>Hola, ${escapeHtml(order.full_name)}:</p>
<p>Recibimos el pago de tu pedido. Lo preparamos y te avisamos cuando salga.</p>
<table style="border-collapse:collapse">${lines.map((l) => row(l.label, l.amount)).join('')}</table>
<table style="border-collapse:collapse;margin-top:12px">${totals.map(([label, value]) => row(label, value)).join('')}</table>
<p>Referencia: ${escapeHtml(order.id)}</p>
<p><a href="${escapeHtml(receiptUrl)}">Ver el recibo</a></p>
<p>Hilo — ropa de todos los días</p>
</body></html>`

  return { to: order.email, subject: `Recibimos tu pago — pedido ${reference}`, text, html }
}
