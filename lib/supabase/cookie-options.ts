import type { CookieOptions } from '@supabase/ssr'

export const SESSION_COOKIE_OPTIONS: CookieOptions = { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }

// SSR fija 400 días después de cookieOptions: ajustar en setAll para respetar siete días.
export function sessionCookieOptions(options: CookieOptions): CookieOptions {
  return { ...options, maxAge: options.maxAge === 0 ? 0 : 60 * 60 * 24 * 7 }
}
