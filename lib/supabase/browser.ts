'use client'

import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { SESSION_COOKIE_OPTIONS, sessionCookieOptions } from './cookie-options'

export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll: () => parseCookieHeader(document.cookie),
        setAll: (values) => values.forEach(({ name, value, options }) => {
          document.cookie = serializeCookieHeader(name, value, sessionCookieOptions(options))
        }),
      },
    },
  )
}
