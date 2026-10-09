import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AddToCart } from '@/components/add-to-cart'
import { ProductImage } from '@/components/product-image'
import { CATEGORIES, discountPct, formatPrice, isOnSale, supabase, unitPrice, type Product } from '@/lib/shop'

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
    <article className="mx-auto max-w-7xl md:grid md:grid-cols-2 md:items-start md:gap-10">
      <ProductImage
        src={product.image_url}
        alt={product.name}
        color={product.color}
        sizes="(min-width: 1280px) 620px, (min-width: 768px) 50vw, 100vw"
        priority
        className="h-[48svh] w-full md:sticky md:top-24 md:h-[70vh]"
        imgClassName="transition-transform duration-[1200ms] ease-[var(--ease-out)] hover:scale-[1.02]"
      />

      <div className="w-full px-6 py-8 md:py-12">
        <h1 className="text-[2rem] font-light leading-tight">{product.name}</h1>
        <p className="meta mt-2 text-muted">
          {isOnSale(product) ? (
            <>
              <span className="line-through">{formatPrice(product.price_cents)}</span>{' '}
              <span className="text-ink">{formatPrice(unitPrice(product))}</span>
              <span className="label ml-3 bg-ink/90 px-2 py-1 text-paper">
                −{discountPct(product)}%
              </span>
            </>
          ) : (
            formatPrice(product.price_cents)
          )}
        </p>

        <div className="mt-10">
          <AddToCart product={product} />
        </div>

        <div className="mt-14 border-t border-line pt-8">
          <p className="label mb-5 text-muted">Descripción</p>
          <p className="text-[1.1rem] leading-relaxed">{product.description}</p>
          <p className="mt-5 text-[1.1rem] leading-relaxed text-muted">
            Categoría:{' '}
            <Link href={`/?categoria=${product.category}#catalogo`} className="inline-flex min-h-11 items-center italic text-ink underline underline-offset-4 transition-colors duration-300 ease-out hover:text-muted">
              {CATEGORIES.find((category) => category.slug === product.category)?.label ?? product.category}
            </Link>
          </p>
        </div>
      </div>
    </article>
  )
}
