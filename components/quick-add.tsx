'use client'

import { useId, useRef, useState } from 'react'
import { useCart } from './cart'
import { sameLine } from '@/lib/cart'
import { isSoldOut, stockFor, unitPrice, type Product } from '@/lib/shop'

export function QuickAdd({ product }: { product: Product }) {
  const { add, items } = useCart()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const panelId = useId()
  const trigger = useRef<HTMLButtonElement>(null)

  const onPick = (size: string) => {
    // Igual que en la ficha: no juntar en el carrito más de lo que queda de ese talle.
    const inCart = items.find((item) => sameLine(item, product.slug, size))?.qty ?? 0
    const available = stockFor(product, size)
    if (inCart + 1 > available) {
      setOpen(false)
      setMessage(`Sólo quedan ${available}${size ? ` en talle ${size}` : ''} y ya están en tu carrito.`)
      trigger.current?.focus()
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
    setOpen(false)
    setMessage(result.error ?? `Agregado al carrito${size ? `, talle ${size}` : ''}.`)
    trigger.current?.focus()
  }

  if (isSoldOut(product)) {
    return <span className="label text-muted">Agotado</span>
  }

  return (
    <div onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false)
        trigger.current?.focus()
      }
    }}>
      <button
        ref={trigger}
        type="button"
        onClick={() => product.sizes.length > 0 ? setOpen((v) => !v) : onPick('')}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? `Cerrar talles de ${product.name}` : `Agregar ${product.name} al carrito`}
        className="label inline-flex min-h-11 items-center justify-center gap-2 px-3 text-ink underline underline-offset-4 transition-colors duration-200 hover:text-muted"
      >
        {open ? 'Cerrar talles' : 'Agregar'}
      </button>

      {open && (
        <div id={panelId} role="group" aria-label={`Elegí talle de ${product.name}`} className="pop mt-2 flex flex-wrap gap-1 border border-line bg-paper p-2">
          {product.sizes.map((s) => {
            const out = stockFor(product, s) < 1
            return (
              <button
                key={s}
                type="button"
                onClick={() => onPick(s)}
                disabled={out}
                aria-label={out ? `${s}, agotado` : undefined}
                className="label inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed disabled:line-through disabled:hover:text-muted"
              >
                {s}
              </button>
            )
          })}
        </div>
      )}
      <p role="status" aria-live="polite" aria-atomic="true" className="meta mt-1 text-ink">{message}</p>
    </div>
  )
}
