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

// Sin decimales: en pesos los centavos no se usan y "$ 24.900,00" solo añade ruido.
// La columna sigue siendo price_cents (centavos de peso), así que el redondeo es de
// presentación: las sumas del carrito y del checkout se hacen siempre en centavos.
const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
export const formatPrice = (cents: number) => ars.format(cents / 100)

/**
 * PENDIENTE: los dos importes siguen siendo los de la etapa en euros (4,95 € y 60 €).
 * En pesos no significan nada. Todo el copy de envíos sale de aquí —cinta superior,
 * pie y carrito—, así que cambiando estas dos constantes se actualiza la tienda entera.
 */
export const SHIPPING_CENTS = 495
export const SHIPPING_FREE_FROM = 6000

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

// Las etiquetas van en rioplatense pero los slugs se quedan como están: son la URL
// pública y la columna `category` de la base. Cambiarlos sería una migración de datos
// y rompería los enlaces que ya circulan.
export const CATEGORIES = [
  { slug: 'camisetas', label: 'Remeras' },
  { slug: 'sudaderas', label: 'Buzos' },
  { slug: 'pantalones', label: 'Pantalones' },
  { slug: 'chaquetas', label: 'Camperas' },
  { slug: 'vestidos', label: 'Vestidos' },
] as const
