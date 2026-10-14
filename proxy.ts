import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_OPTIONS, sessionCookieOptions } from '@/lib/supabase/cookie-options'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, sessionCookieOptions(options)))
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value))
      },
    },
  })
  // Verifica la firma y renueva tokens; los permisos finales los aplica RLS.
  await client.auth.getClaims()
  return response
}

export const config = { matcher: ['/cuenta/:path*', '/auth/:path*', '/carrito', '/pedido/:path*', '/vendedor'] }
