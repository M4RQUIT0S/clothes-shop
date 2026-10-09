'use client'

import { useId, useRef, useState } from 'react'
import { useCart } from './cart'
import { unitPrice, type Product } from '@/lib/shop'

export function QuickAdd({ product }: { product: Product }) {
  const { add } = useCart()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const panelId = useId()
  const trigger = useRef<HTMLButtonElement>(null)

  const onPick = (size: string) => {
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

  if (product.stock < 1) {
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
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="label inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-muted transition-colors duration-200 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <p role="status" aria-live="polite" aria-atomic="true" className="meta mt-1 text-ink">{message}</p>
    </div>
  )
}
