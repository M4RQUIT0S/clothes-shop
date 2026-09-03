import { createClient } from '@supabase/supabase-js'

export type Product = {
  id: string
  slug: string
  name: string
  description: string
  price_cents: number
  category: string
  sizes: string[]
  stock: number
  color: string
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

export const CATEGORIES = [
  { slug: 'camisetas', label: 'Camisetas' },
  { slug: 'sudaderas', label: 'Sudaderas' },
  { slug: 'pantalones', label: 'Pantalones' },
  { slug: 'chaquetas', label: 'Chaquetas' },
  { slug: 'vestidos', label: 'Vestidos' },
] as const
