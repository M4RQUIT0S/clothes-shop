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
