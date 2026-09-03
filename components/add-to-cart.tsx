'use client'

import { useState } from 'react'
import { useCart } from './cart'
import type { Product } from '@/lib/shop'

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
      price_cents: product.price_cents,
      image_url: product.image_url,
      color: product.color,
      qty: 1,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="space-y-5">
      {product.sizes.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-xs uppercase tracking-widest text-ink/50">Talla</legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={s === size}
                className={`min-w-12 border px-3 py-2 text-sm transition ${
                  s === size
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/20 hover:border-ink/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button
        type="button"
        onClick={onAdd}
        disabled={soldOut}
        className="w-full bg-ink px-6 py-4 text-sm uppercase tracking-widest text-paper transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-ink/30"
      >
        {soldOut ? 'Agotado' : added ? 'Añadido ✓' : 'Añadir al carrito'}
      </button>

      <p className="text-xs text-ink/50">
        {soldOut ? 'Sin stock ahora mismo.' : `${product.stock} unidades disponibles`}
      </p>
    </div>
  )
}
