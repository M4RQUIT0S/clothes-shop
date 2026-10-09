import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { EmailOrder } from './order-email.ts'
import type { PaymentInfo } from './payment-sync.ts'
import type { NewOrderRow, OrderLine, OrderStore, StoredOrder } from './place-order.ts'
import type { QuoteProduct } from './quote.ts'

/**
 * Acceso a pedidos con la service role: la tabla orders no tiene políticas para el
 * cliente, así que nada de esto funciona con la clave pública, a propósito.
 */
export function adminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
}

type CatalogRow = Omit<QuoteProduct, 'variants'> & { product_variants: { size: string; stock: number }[] | null }

export async function loadCatalog(db: SupabaseClient, slugs: string[]): Promise<QuoteProduct[]> {
  const { data, error } = await db
    .from('products')
    .select('slug, name, price_cents, sale_price_cents, sizes, product_variants(size, stock)')
    .in('slug', slugs)
  if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`)
  return (data as unknown as CatalogRow[]).map(({ product_variants, ...product }) => ({
    ...product,
    variants: product_variants ?? [],
  }))
}

const STORED_COLUMNS = 'id, request_hash, status, total_cents, shipping_cents, payment_url, email, items'

export function orderStore(db: SupabaseClient): OrderStore {
  return {
    loadCatalog: (slugs) => loadCatalog(db, slugs),

    async findByIdempotencyKey(key) {
      const { data, error } = await db.from('orders').select(STORED_COLUMNS).eq('idempotency_key', key).maybeSingle()
      if (error) throw new Error(`No se pudo buscar el pedido: ${error.message}`)
      return data as StoredOrder | null
    },

    async insert(row: NewOrderRow) {
      const { error } = await db.from('orders').insert(row)
      if (!error) return 'inserted'
      // 23505: unique_violation. Sólo la clave idempotente puede chocar; el id es un UUID nuevo.
      if (error.code === '23505' && error.message.includes('idempotency_key')) return 'duplicate_key'
      throw new Error(`No se pudo guardar el pedido: ${error.message}`)
    },

    async savePayment(orderId, { preferenceId, url }) {
      const { error } = await db.from('orders').update({ mp_preference_id: preferenceId, payment_url: url }).eq('id', orderId)
      if (error) throw new Error(`No se pudo guardar el cobro del pedido: ${error.message}`)
    },
  }
}

export async function confirmPayment(db: SupabaseClient, orderId: string, payment: PaymentInfo): Promise<string> {
  const { data, error } = await db.rpc('confirm_order_payment', {
    p_order_id: orderId,
    p_payment_id: payment.id,
    p_payment_status: payment.status,
    p_amount_cents: payment.amount_cents,
    p_currency: payment.currency,
  })
  if (error) throw new Error(`No se pudo confirmar el pago: ${error.message}`)
  return data as string
}

/** Lo que muestra el recibo y lo que lleva el correo. Incluye datos personales: sólo servidor. */
export type ReceiptOrder = EmailOrder & {
  status: string
  payment_status: string | null
  email_sent_at: string | null
  created_at: string
  items: OrderLine[]
}

export async function loadReceiptOrder(db: SupabaseClient, orderId: string): Promise<ReceiptOrder | null> {
  const { data, error } = await db
    .from('orders')
    .select('id, full_name, email, items, subtotal_cents, shipping_cents, total_cents, status, payment_status, email_sent_at, created_at')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw new Error(`No se pudo leer el pedido: ${error.message}`)
  return data as ReceiptOrder | null
}

export async function markEmailSent(db: SupabaseClient, orderId: string) {
  const { error } = await db.from('orders').update({ email_sent_at: new Date().toISOString() }).eq('id', orderId).is('email_sent_at', null)
  if (error) throw new Error(`No se pudo marcar el correo como enviado: ${error.message}`)
}
