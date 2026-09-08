import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AddToCart } from '@/components/add-to-cart'
import { ProductImage } from '@/components/product-image'
import { discountPct, formatPrice, isOnSale, supabase, unitPrice, type Product } from '@/lib/shop'

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
    <article>
      <ProductImage
        src={product.image_url}
        alt={product.name}
        color={product.color}
        sizes="100vw"
        priority
        className="h-[72vh] w-full md:h-[86vh]"
        imgClassName="transition-transform duration-[1200ms] ease-[var(--ease-out)] hover:scale-[1.02]"
      />

      <div className="mx-auto max-w-xl px-6 py-14">
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
            <Link href={`/?categoria=${product.category}`} className="italic text-ink underline underline-offset-4 transition-colors duration-300 ease-out hover:text-muted">
              {product.category}
            </Link>
          </p>
        </div>
      </div>
    </article>
  )
}
