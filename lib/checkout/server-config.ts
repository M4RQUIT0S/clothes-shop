import 'server-only'

/**
 * Configuración del checkout, sólo servidor. Ninguna de estas variables lleva el
 * prefijo NEXT_PUBLIC_: no deben llegar nunca al navegador.
 *
 * - SUPABASE_SERVICE_ROLE_KEY: escribe pedidos y confirma pagos.
 * - MP_ACCESS_TOKEN: credencial de Mercado Pago (de prueba en desarrollo).
 * - MP_WEBHOOK_SECRET: clave secreta de las notificaciones (Tus integraciones > Webhooks).
 * - RECEIPT_SECRET: al menos 32 caracteres; firma los enlaces privados a los recibos.
 * - SITE_URL: origen público (https://...), para las vueltas de Mercado Pago y el correo.
 * - RESEND_API_KEY y RESEND_FROM: opcionales. Sin ellas no se manda correo y el recibo lo dice.
 */
export type CheckoutConfig = {
  supabaseUrl: string
  serviceRoleKey: string
  mpAccessToken: string
  mpWebhookSecret: string
  receiptSecret: string
  siteUrl: string
  resend: { apiKey: string; from: string } | null
}

export function readCheckoutConfig(): { ok: true; config: CheckoutConfig } | { ok: false; missing: string[] } {
  const env = process.env
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    MP_ACCESS_TOKEN: env.MP_ACCESS_TOKEN,
    MP_WEBHOOK_SECRET: env.MP_WEBHOOK_SECRET,
    RECEIPT_SECRET: env.RECEIPT_SECRET,
    SITE_URL: env.SITE_URL,
  }
  const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name)
  if ((env.RECEIPT_SECRET ?? '').length > 0 && env.RECEIPT_SECRET!.length < 32) missing.push('RECEIPT_SECRET (mínimo 32 caracteres)')
  if (missing.length) return { ok: false, missing }

  return {
    ok: true,
    config: {
      supabaseUrl: required.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey: required.SUPABASE_SERVICE_ROLE_KEY!,
      mpAccessToken: required.MP_ACCESS_TOKEN!,
      mpWebhookSecret: required.MP_WEBHOOK_SECRET!,
      receiptSecret: required.RECEIPT_SECRET!,
      siteUrl: required.SITE_URL!.replace(/\/+$/, ''),
      resend: env.RESEND_API_KEY && env.RESEND_FROM ? { apiKey: env.RESEND_API_KEY, from: env.RESEND_FROM } : null,
    },
  }
}
