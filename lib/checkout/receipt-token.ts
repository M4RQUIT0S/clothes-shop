import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Llave del enlace privado al recibo: /pedido/<id>?t=<token>.
 *
 * Se deriva con HMAC del id del pedido y un secreto del servidor (RECEIPT_SECRET), así
 * que la base no guarda nada que permita abrir recibos y un reintento idempotente
 * puede devolver el mismo enlace que ya viajó a Mercado Pago. Rotar el secreto invalida
 * todos los enlaces emitidos: es el precio de no guardarlos.
 */
const MIN_SECRET_LENGTH = 32

function hmac(secret: string, orderId: string) {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`RECEIPT_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`)
  }
  return createHmac('sha256', secret).update(`receipt:${orderId}`).digest()
}

export const receiptToken = (secret: string, orderId: string) => hmac(secret, orderId).toString('base64url')

export function verifyReceiptToken(secret: string, orderId: string, token: unknown): boolean {
  const expected = hmac(secret, orderId)
  // base64url sin relleno de 32 bytes son siempre 43 caracteres; cualquier otra cosa
  // se descarta antes de comparar, y la comparación es de tiempo constante.
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false
  const given = Buffer.from(token, 'base64url')
  return given.length === expected.length && timingSafeEqual(given, expected)
}
