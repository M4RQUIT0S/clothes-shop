'use client'

import { useState } from 'react'
import { useCart } from './cart'
import { SizeGuide } from './size-guide'
import { unitPrice, type Product } from '@/lib/shop'
import { sizeGuideFor } from '@/lib/size-guide'

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart()
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : '')
  const [message, setMessage] = useState('')
  const soldOut = product.stock < 1
  const needsSize = product.sizes.length > 0 && !size
  const guide = sizeGuideFor(product)

  const onAdd = () => {
    if (soldOut || needsSize) return
    const result = add({
      slug: product.slug,
      name: product.name,
      size,
      price_cents: unitPrice(product),
      image_url: product.image_url,
      color: product.color,
      qty: 1,
    })
    setMessage(result.error ?? `Agregado al carrito${size ? `, talle ${size}` : ''}.`)
  }

  return (
    <div>
      {product.sizes.length > 0 && (
        <fieldset>
          <legend className="mb-4 text-[1.05rem]">Elegí tu talle</legend>
          <div className="flex flex-wrap gap-6">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={s === size}
                className={`label inline-flex min-h-11 min-w-11 items-center justify-center px-2 transition-colors duration-200 ease-out ${
                  s === size
                    ? 'border-b border-ink text-ink'
                    : 'border-b border-transparent text-muted hover:text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {guide && <SizeGuide guide={guide} selected={size} />}

      <p className="label mt-6 text-muted">
        {soldOut ? 'Sin stock ahora mismo' : `${product.stock} unidades disponibles`}
      </p>

      <button
        type="button"
        onClick={onAdd}
        disabled={soldOut || needsSize}
        className="label mt-6 w-full bg-ink py-4 text-paper transition-colors duration-300 ease-out hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {soldOut ? 'Agotado' : needsSize ? 'Elegí un talle para agregar' : 'Agregar al carrito'}
      </button>
      <p role="status" aria-live="polite" aria-atomic="true" className="meta mt-3 text-ink">
        {message}
      </p>
    </div>
  )
}
