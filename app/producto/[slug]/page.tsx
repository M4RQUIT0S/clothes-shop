import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AddToCart } from '@/components/add-to-cart'
import { ProductArt } from '@/components/product-art'
import { formatPrice, supabase, type Product } from '@/lib/shop'

export const revalidate = 60

export async function generateStaticParams() {
  const { data } = await supabase.from('products').select('slug')
  return (data ?? []).map(({ slug }) => ({ slug }))
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle()

  if (error) {
    console.error('Error cargando el producto:', error)
    throw new Error('No hemos podido cargar el producto.')
  }
  if (!data) notFound()

  const product = data as Product

  return (
    <article className="mx-auto grid max-w-6xl gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
      <ProductArt category={product.category} color={product.color} className="aspect-[4/5] w-full" />

      <div className="md:max-w-sm">
        <Link
          href={`/?categoria=${product.category}`}
          className="text-xs uppercase tracking-widest text-ink/50 hover:text-ink"
        >
          {product.category}
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-tight">{product.name}</h1>
        <p className="mt-3 text-lg">{formatPrice(product.price_cents)}</p>
        <p className="mt-6 text-ink/70">{product.description}</p>
        <div className="mt-10">
          <AddToCart product={product} />
        </div>
      </div>
    </article>
  )
}
