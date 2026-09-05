import Link from 'next/link'
import { ProductImage } from './product-image'
import { QuickAdd } from './quick-add'
import { discountPct, formatPrice, isOnSale, unitPrice, type Product } from '@/lib/shop'

export function ProductCard({ product, sizes }: { product: Product; sizes: string }) {
  const href = `/producto/${product.slug}`

  const onSale = isOnSale(product)

  return (
    <article className="group">
      <Link href={href} className="relative block">
        {onSale && (
          <span className="label absolute left-2 top-2 z-10 bg-ink/90 px-2 py-1 text-paper">
            −{discountPct(product)}%
          </span>
        )}
        <ProductImage
          src={product.image_url}
          alt={product.name}
          color={product.color}
          sizes={sizes}
          className="aspect-[3/4] w-full"
          /* ponytail: el sitio de referencia cruza a una segunda foto en hover; con
             una sola imagen por producto, el acercamiento lento es el equivalente
             honesto. Para el cruce real haría falta una columna image_url_hover. */
          imgClassName="transition-transform duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-[1.04]"
        />
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="truncate text-[0.95rem] font-light">
            <Link href={href} className="transition-colors duration-300 ease-out hover:text-muted">
              {product.name}
            </Link>
          </h3>
          <p className="meta mt-1 text-muted">
            {onSale ? (
              <>
                <span className="line-through">{formatPrice(product.price_cents)}</span>{' '}
                <span className="text-ink">{formatPrice(unitPrice(product))}</span>
              </>
            ) : (
              formatPrice(product.price_cents)
            )}
          </p>
        </div>
        <QuickAdd product={product} />
      </div>
    </article>
  )
}
