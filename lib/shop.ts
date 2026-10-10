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
  /** Stock por talle (tabla product_variants). Sólo llega si la consulta lo pide. */
  product_variants?: Variant[]
  color: string
  created_at: string
}

export type Variant = { size: string; stock: number }

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
 * Centavos de peso. Todo el copy de envíos sale de aquí —cinta superior, pie y
 * carrito—, así que cambiando estas dos constantes se actualiza la tienda entera.
 *
 * El coste sale de convertir los 4,95 € originales a 1 EUR = 1.756,53 ARS (oficial,
 * 8/9/2026). El umbral de envío gratis se redondea a 100.000 en vez de a los 105.392
 * que daría la conversión: es un número que el comprador tiene que poder retener.
 */
export const SHIPPING_CENTS = 890_000
export const SHIPPING_FREE_FROM = 10_000_000

/**
 * Envío para un subtotal. El carrito vacío no paga envío (si no, la cesta sin nada
 * mostraría un total de sólo portes), y el umbral es inclusivo: justo en la cifra
 * anunciada ya es gratis, que es lo que el comprador entiende al leer «desde».
 */
export const shippingFor = (totalCents: number) =>
  totalCents === 0 || totalCents >= SHIPPING_FREE_FROM ? 0 : SHIPPING_CENTS

type Priced = Pick<Product, 'price_cents' | 'sale_price_cents'>

/**
 * La rebaja sólo cuenta si de verdad baja el precio y no es cero: así una fila mal
 * cargada no regala nada. El cero lo veta también la base, pero esto es lo que evita
 * cobrar 0 si alguna fila se coló antes de que existiera ese check.
 */
export const isOnSale = (p: Priced) =>
  typeof p.sale_price_cents === 'number' &&
  p.sale_price_cents > 0 &&
  p.sale_price_cents < p.price_cents

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

/** Una prenda sin talles listados es de talle único y se vende como ''. */
export const sizesOf = (p: Pick<Product, 'sizes'>) => (p.sizes.length ? p.sizes : [''])

/** Unidades de un talle. Un talle sin fila de stock cuenta como agotado, igual que en el servidor. */
export const stockFor = (p: Pick<Product, 'product_variants'>, size: string) =>
  p.product_variants?.find((v) => v.size === size)?.stock ?? 0

export const isSoldOut = (p: Pick<Product, 'sizes' | 'product_variants'>) =>
  sizesOf(p).every((size) => stockFor(p, size) < 1)

/** Columnas que piden la ficha y el catálogo: la prenda más su stock por talle. */
export const PRODUCT_WITH_STOCK = '*, product_variants(size, stock)'
