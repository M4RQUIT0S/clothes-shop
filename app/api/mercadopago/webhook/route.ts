import type { NextRequest } from 'next/server'
import { readCheckoutConfig } from '@/lib/checkout/server-config'
import { checkoutServices } from '@/lib/checkout/services'
import { verifyWebhookSignature } from '@/lib/mercadopago'

/**
 * Notificaciones de Mercado Pago (evento «Order (Mercado Pago)», configurado en Tus
 * integraciones > Webhooks: la API de Órdenes no admite URL de aviso por orden).
 *
 * El cuerpo no se usa: sólo dispara una relectura de la orden en la API. Hay que
 * contestar 200/201 en menos de 22 s; cualquier otra cosa hace que Mercado Pago
 * reintente (hasta días después), y por eso confirmar un pago es idempotente.
 */
export async function POST(request: NextRequest) {
  const config = readCheckoutConfig()
  if (!config.ok) {
    console.error('Webhook de Mercado Pago sin configurar, faltan:', config.missing.join(', '))
    return new Response('Servicio no disponible', { status: 503 })
  }

  const params = request.nextUrl.searchParams
  const dataId = params.get('data.id')
  const valid = verifyWebhookSignature({
    secret: config.config.mpWebhookSecret,
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    dataId,
  })
  if (!valid) return new Response('Firma inválida', { status: 401 })

  // Otros eventos del panel (reclamos, alertas de fraude...) no tocan pedidos.
  if (params.get('type') !== 'order' || !dataId) return new Response('Ignorado', { status: 200 })

  try {
    const result = await checkoutServices(config.config).sync(dataId)
    if (result.outcome !== 'synced') console.warn('Aviso de Mercado Pago sin pedido que actualizar:', dataId, result.outcome)
  } catch (error) {
    console.error('Error aplicando el aviso de Mercado Pago', dataId, error)
    return new Response('Error', { status: 500 })
  }
  return new Response('OK', { status: 200 })
}
