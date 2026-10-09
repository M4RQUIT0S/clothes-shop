import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Integración con Mercado Pago Checkout Pro por su API REST, con fetch: crear la
 * preferencia, leer un pago y validar la firma de las notificaciones. Sólo servidor.
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
