'use client'

import { useState } from 'react'
import { useCart } from './cart'
import { unitPrice, type Product } from '@/lib/shop'

export function QuickAdd({ product }: { product: Product }) {
  const { add } = useCart()
  const [open, setOpen] = useState(false)
  const [added, setAdded] = useState(false)

  const onPick = (size: string) => {
    add({
      slug: product.slug,
      name: product.name,
      size,
      price_cents: unitPrice(product),
      image_url: product.image_url,
      color: product.color,
      qty: 1,
    })
    setOpen(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  if (product.stock < 1) {
    return <span className="label text-muted">Agotado</span>
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Agregar ${product.name} al carrito`}
        className="px-1 text-lg leading-none text-muted transition-colors duration-300 ease-out hover:text-ink"
      >
        {added ? '✓' : open ? '×' : '+'}
      </button>

      {open && (
        <div className="pop absolute right-0 z-10 mt-2 flex gap-3 border border-line bg-paper px-4 py-3 shadow-sm">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="label text-muted transition-colors duration-300 ease-out hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
