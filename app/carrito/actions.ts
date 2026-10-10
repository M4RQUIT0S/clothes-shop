'use server'

import { z } from 'zod'
import { MAX_CART_LINES, MAX_ITEM_QUANTITY } from '@/lib/cart'
import { placeOrder, type PlaceOrderInput, type PlaceOrderResult } from '@/lib/checkout/place-order'
import { buildQuote, quoteFingerprint, type LineProblem, type Quote } from '@/lib/checkout/quote'
import { readCheckoutConfig } from '@/lib/checkout/server-config'
import { adminClient, loadCatalog, orderStore } from '@/lib/checkout/supabase-store'
import { mercadoPagoCheckout } from '@/lib/mercadopago'
import { supabase } from '@/lib/shop'

export type { PlaceOrderInput, PlaceOrderResult } from '@/lib/checkout/place-order'

export type QuoteResult =
  | { ok: true; quote: Quote; fingerprint: string; problems: LineProblem[] }
  | { ok: false; error: string }

const ItemsSchema = z.array(z.object({
  slug: z.string().min(1).max(120),
  size: z.string().max(20),
  qty: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
})).min(1).max(MAX_CART_LINES)

/**
 * Cotización del carrito con precios, talles y stock vigentes. No toca pedidos ni
 * datos personales: lee el catálogo público, así que funciona aunque los pagos no
 * estén configurados.
 */
export async function quoteCart(items: unknown): Promise<QuoteResult> {
  const parsed = ItemsSchema.safeParse(items)
  if (!parsed.success) return { ok: false, error: 'El carrito tiene datos inválidos. Revisalo.' }
  try {
    const catalog = await loadCatalog(supabase, [...new Set(parsed.data.map((i) => i.slug))])
    const { quote, problems } = buildQuote(catalog, parsed.data)
    return { ok: true, quote, fingerprint: quoteFingerprint(quote), problems }
  } catch (error) {
    console.error('Error cotizando el carrito:', error)
    return { ok: false, error: 'No pudimos calcular el total. Probá de nuevo.' }
  }
}

/** Registra el pedido (idempotente) y devuelve a dónde ir a pagar. */
export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const config = readCheckoutConfig()
  if (!config.ok) {
    // Los nombres de lo que falta se quedan en el log del servidor.
    console.error('Checkout sin configurar, faltan:', config.missing.join(', '))
    return { ok: false, code: 'PAYMENT_UNAVAILABLE', error: 'Los pagos no están disponibles en este momento. Probá más tarde.' }
  }
  const { supabaseUrl, serviceRoleKey, receiptSecret, siteUrl } = config.config
  return placeOrder({
    store: orderStore(adminClient(supabaseUrl, serviceRoleKey)),
    createCheckout: mercadoPagoCheckout(config.config),
    receiptSecret,
    siteUrl,
  }, input)
}
