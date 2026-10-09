/**
 * Envío de correo por la API de Resend con fetch: son cuatro cabeceras y un POST,
 * no hace falta el SDK. Sólo servidor: la API no admite CORS y la clave es secreta.
 */
export type MailMessage = { to: string; subject: string; html: string; text: string; idempotencyKey: string }
export type MailResult = { ok: true; id: string } | { ok: false; error: string; retryable: boolean }
export type Mailer = (message: MailMessage) => Promise<MailResult>

export function resendMailer({ apiKey, from, fetch: doFetch = fetch }: {
  apiKey: string
  from: string
  fetch?: typeof fetch
}): Mailer {
  return async ({ to, subject, html, text, idempotencyKey }) => {
    let response: Response
    try {
      response = await doFetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // Resend rechaza peticiones sin User-Agent.
          'User-Agent': 'clothes-shop/1.0',
          // Misma clave y mismo cuerpo dentro de 24 h: Resend no reenvía. Más allá de
          // eso, lo que evita el duplicado es orders.email_sent_at.
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ from, to, subject, html, text }),
      })
    } catch (error) {
      return { ok: false, retryable: true, error: error instanceof Error ? error.message : String(error) }
    }

    // Un proxy delante de Resend puede contestar con HTML: el cuerpo no siempre es JSON.
    const body = await response.json().catch(() => null) as { id?: string; name?: string; message?: string } | null
    if (response.ok && body?.id) return { ok: true, id: body.id }
    return {
      ok: false,
      // 409 concurrent_idempotent_requests, 429 y 5xx se arreglan solos esperando.
      retryable: response.status === 429 || response.status >= 500 || body?.name === 'concurrent_idempotent_requests',
      error: body?.name ? `${body.name}: ${body.message ?? ''}` : `HTTP ${response.status}`,
    }
  }
}
