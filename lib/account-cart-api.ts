'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { browserClient } from './supabase/browser'
import { CartOperationRejected, presentCart, type CartOperation } from './account-cart'
import type { CartItem, OrderedLine } from './cart'

/** Captura el token de ESTA cuenta: un cambio de sesión no redirige una petición en vuelo. */
async function accountClient(owner: string) {
  const { data, error } = await browserClient().auth.getSession()
  if (error || data.session?.user.id !== owner) throw new Error('La sesión cambió.')
  const token = data.session.access_token
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    accessToken: async () => token,
  })
}
async function enrich(db: SupabaseClient, lines: OrderedLine[]): Promise<CartItem[]> {
  if (!lines.length) return []
  const { data, error } = await db.from('products').select('slug,name,price_cents,sale_price_cents,image_url,color').in('slug', [...new Set(lines.map((line) => line.slug))])
  if (error) throw error
  return presentCart(lines, (data ?? []).map((product) => ({ ...product, price_cents: product.sale_price_cents ?? product.price_cents, size: '', qty: 1 })))
}
export async function readAccountCart(owner: string) {
  const db = await accountClient(owner)
  const { data, error } = await db.from('account_carts').select('items').eq('user_id', owner).maybeSingle()
  if (error) throw error
  return enrich(db, data?.items ?? [])
}
export async function mutateAccountCart(owner: string, op: CartOperation) {
  const db = await accountClient(owner)
  const { data, error } = await db.rpc('mutate_account_cart', { p_id: op.id, p_kind: op.kind, p_lines: op.lines })
  if (error?.code === '22023') throw new CartOperationRejected()
  if (error) throw error
  // Un fallo leyendo el catálogo ocurre después del commit: conserva el UUID para reintentar.
  return enrich(db, data as OrderedLine[])
}
