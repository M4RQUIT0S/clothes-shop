'use client'

import { useState } from 'react'
import { useCart } from './cart'
import { unitPrice, type Product } from '@/lib/shop'

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart()
  const [size, setSize] = useState(product.sizes[0] ?? '')
  const [added, setAdded] = useState(false)
  const soldOut = product.stock < 1

  const onAdd = () => {
    add({
      slug: product.slug,
      name: product.name,
      size,
      price_cents: unitPrice(product),
      image_url: product.image_url,
      color: product.color,
      qty: 1,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div>
      {product.sizes.length > 0 && (
        <fieldset>
          <legend className="mb-4 text-[1.05rem]">Elige tu talla</legend>
          <div className="flex flex-wrap gap-6">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={s === size}
                className={`label pb-1 transition-colors duration-300 ease-out ${
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

      <p className="label mt-6 text-muted">
        {soldOut ? 'Sin stock ahora mismo' : `${product.stock} unidades disponibles`}
      </p>

      <button
        type="button"
        onClick={onAdd}
        disabled={soldOut}
        className="label mt-6 w-full bg-ink py-4 text-paper transition-colors duration-300 ease-out hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {soldOut ? 'Agotado' : added ? 'Añadido a la cesta ✓' : 'Añadir a la cesta'}
      </button>
    </div>
  )
}
