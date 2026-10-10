'use client'

import { useState } from 'react'
import { useCart } from './cart'
import { SizeGuide } from './size-guide'
import { sameLine } from '@/lib/cart'
import { isSoldOut, stockFor, unitPrice, type Product } from '@/lib/shop'
import { sizeGuideFor } from '@/lib/size-guide'

export function AddToCart({ product }: { product: Product }) {
  const { add, items } = useCart()
  // Un único talle con stock se preselecciona; si está agotado, no hay nada que elegir.
  const [size, setSize] = useState(product.sizes.length === 1 && stockFor(product, product.sizes[0]) > 0 ? product.sizes[0] : '')
  const [message, setMessage] = useState('')
  const soldOut = isSoldOut(product)
  const available = stockFor(product, size)
  const needsSize = product.sizes.length > 0 && !size
  const guide = sizeGuideFor(product)

  const onAdd = () => {
    if (soldOut || needsSize) return
    // El servidor vuelve a comprobar al cotizar; esto sólo evita juntar más de lo que hay.
    const inCart = items.find((item) => sameLine(item, product.slug, size))?.qty ?? 0
    if (inCart + 1 > available) {
      setMessage(`Sólo quedan ${available}${size ? ` en talle ${size}` : ''} y ya están en tu carrito.`)
      return
    }
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
            {product.sizes.map((s) => {
              const out = stockFor(product, s) < 1
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSize(s); setMessage('') }}
                  disabled={out}
                  aria-pressed={s === size}
                  aria-label={out ? `${s}, agotado` : undefined}
                  className={`label inline-flex min-h-11 min-w-11 items-center justify-center px-2 transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:text-muted disabled:line-through ${
                    s === size
                      ? 'border-b border-ink text-ink'
                      : 'border-b border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}
      {guide && <SizeGuide guide={guide} selected={size} />}

      <p className="label mt-6 text-muted">
        {soldOut
          ? 'Sin stock ahora mismo'
          : needsSize
            ? 'Elegí un talle para ver cuántas quedan'
            : `${available} ${available === 1 ? 'disponible' : 'disponibles'}${size ? ` en talle ${size}` : ''}`}
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
