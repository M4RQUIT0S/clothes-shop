import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { SESSION_COOKIE_OPTIONS, sessionCookieOptions } from './cookie-options'

export async function serverClient() {
  const jar = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, sessionCookieOptions(options))) }
        catch { /* Los Server Components son de sólo lectura; Proxy renueva la sesión. */ }
      },
    },
  })
}

/**
 * Cliente con la sesión de quien vende, o por qué no la hay. Sirve a la interfaz y a
 * los mensajes: la RLS vuelve a comprobarlo en cada escritura (sellers / is_seller).
 */
export async function sellerSession() {
  const db = await serverClient()
  const { data } = await db.auth.getClaims()
  const userId = data?.claims.sub
  if (!userId) return { ok: false, reason: 'anonymous' } as const
  const { data: seller, error } = await db.from('sellers').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`No se pudo comprobar el acceso de vendedor: ${error.message}`)
  return seller ? { ok: true, db } as const : { ok: false, reason: 'forbidden' } as const
}
