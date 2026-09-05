import { createClient } from '@supabase/supabase-js'

export type Product = {
  id: string
  slug: string
  name: string
  description: string
  price_cents: number
  /** Precio rebajado. null (o ausente, si aún no se ha migrado) = sin promoción. */
  sale_price_cents: number | null
  image_url: string
  category: string
  sizes: string[]
  stock: number
  color: string
  created_at: string
}

/** Entrada de «novedades de la casa» que se asoma en la portada. */
export type News = {
  id: string
  slug: string
  title: string
  excerpt: string
  image_url: string
  href: string
  published_at: string
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env.local.'
  )
}

export const supabase = createClient(url, key)

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
export const formatPrice = (cents: number) => eur.format(cents / 100)

type Priced = Pick<Product, 'price_cents' | 'sale_price_cents'>

/** La rebaja sólo cuenta si de verdad baja el precio: así una fila mal cargada no regala nada. */
export const isOnSale = (p: Priced) =>
  typeof p.sale_price_cents === 'number' && p.sale_price_cents < p.price_cents

/**
 * Lo que se cobra por una unidad. Única fuente de verdad: la usan la ficha, la
 * tarjeta, el carrito y el checkout, para que no puedan discrepar.
 */
export const unitPrice = (p: Priced) => (isOnSale(p) ? p.sale_price_cents! : p.price_cents)

export const discountPct = (p: Priced) =>
  isOnSale(p) ? Math.round((1 - p.sale_price_cents! / p.price_cents) * 100) : 0

export const CATEGORIES = [
  { slug: 'camisetas', label: 'Camisetas' },
  { slug: 'sudaderas', label: 'Sudaderas' },
  { slug: 'pantalones', label: 'Pantalones' },
  { slug: 'chaquetas', label: 'Chaquetas' },
  { slug: 'vestidos', label: 'Vestidos' },
] as const
