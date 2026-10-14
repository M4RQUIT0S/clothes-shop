import type { Metadata } from 'next'
import Link from 'next/link'
import { CATEGORIES, formatPrice, type Product } from '@/lib/shop'
import { sellerSession } from '@/lib/supabase/server'
import { GarmentForm, GarmentStock } from './forms'

export const metadata: Metadata = { title: 'Panel del vendedor — Hilo', robots: { index: false, follow: false } }

type Listed = Pick<Product, 'id' | 'slug' | 'name' | 'price_cents' | 'category' | 'sizes' | 'product_variants'>

export default async function SellerPage() {
  const session = await sellerSession()
  if (!session.ok) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 md:px-10">
        <h1 className="text-4xl font-light md:text-5xl">Panel del vendedor</h1>
        <p className="mt-6 text-lg">
          {session.reason === 'anonymous' ? 'Iniciá sesión con tu cuenta de vendedor para cargar prendas.' : 'Esta cuenta no tiene acceso al panel del vendedor.'}
        </p>
        <Link href="/cuenta" className="label mt-6 inline-flex min-h-11 items-center bg-ink px-6 text-paper">Ir a mi cuenta</Link>
      </section>
    )
  }

  const { data, error } = await session.db
    .from('products')
    .select('id, slug, name, price_cents, category, sizes, product_variants(size, stock)')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Error cargando el catálogo del panel:', error)
    throw new Error('No pudimos cargar las prendas.')
  }
  const products = data as Listed[]

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 md:px-10">
      <p className="label text-muted">Uso interno</p>
      <h1 className="mt-4 text-4xl font-light md:text-5xl">Panel del vendedor</h1>

      <section aria-labelledby="alta" className="mt-12">
        <h2 id="alta" className="text-2xl font-light">Nueva prenda</h2>
        <p className="mt-2 font-sans text-sm text-muted">Todos los campos son obligatorios, así cada prenda se publica con la misma información.</p>
        <GarmentForm />
      </section>

      <section aria-labelledby="stock" className="mt-16 border-t border-line pt-10">
        <h2 id="stock" className="text-2xl font-light">Prendas en la tienda ({products.length})</h2>
        <ul className="mt-6 divide-y divide-line">
          {products.map((p) => (
            <li key={p.id} className="py-6">
              <p className="text-lg">
                <Link href={`/producto/${p.slug}`} className="underline-offset-4 hover:underline">{p.name}</Link>
              </p>
              <p className="meta text-muted">
                {CATEGORIES.find((c) => c.slug === p.category)?.label ?? p.category} · {formatPrice(p.price_cents)}
              </p>
              <GarmentStock product={p} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
