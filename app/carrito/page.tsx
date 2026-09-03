'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useCart } from '@/components/cart'
import { ProductImage } from '@/components/product-image'
import { formatPrice } from '@/lib/shop'
import { checkout } from './actions'

const SHIPPING_FREE_FROM = 6000
const SHIPPING_CENTS = 495

export default function CartPage() {
  const { items, setQty, remove, clear, total } = useCart()
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState('')
  const [pending, startTransition] = useTransition()

  const shipping = total === 0 || total >= SHIPPING_FREE_FROM ? 0 : SHIPPING_CENTS

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await checkout({
        full_name: String(form.get('full_name') ?? ''),
        email: String(form.get('email') ?? ''),
        address: String(form.get('address') ?? ''),
        items: items.map(({ slug, size, qty }) => ({ slug, size, qty })),
      })

      if (result.ok) {
        clear()
        setOrderId(result.orderId)
      } else {
        setError(result.error)
      }
    })
  }

  if (orderId) {
    return (
      <section className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Pedido confirmado</h1>
        <p className="mt-4 text-ink/70">
          Te hemos enviado los detalles por email. Referencia{' '}
          <code className="text-ink">{orderId.slice(0, 8)}</code>.
        </p>
        <Link href="/" className="mt-8 inline-block border border-ink px-6 py-3 text-sm">
          Seguir comprando
        </Link>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Tu carrito está vacío</h1>
        <Link href="/" className="mt-8 inline-block border border-ink px-6 py-3 text-sm">
          Ver el catálogo
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-16 px-6 py-12 md:grid-cols-[1.2fr_1fr] md:py-20">
      <div>
        <h1 className="font-display text-4xl">Carrito</h1>
        <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
          {items.map((item) => (
            <li key={`${item.slug}-${item.size}`} className="flex gap-4 py-5">
              <ProductImage
                src={item.image_url}
                alt={item.name}
                color={item.color}
                sizes="80px"
                className="aspect-[4/5] w-20 shrink-0"
              />
              <div className="flex-1">
                <Link href={`/producto/${item.slug}`} className="text-sm hover:underline">
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-ink/50">Talla {item.size}</p>
                <div className="mt-3 flex items-center gap-3">
                  <label className="sr-only" htmlFor={`qty-${item.slug}-${item.size}`}>
                    Cantidad de {item.name}
                  </label>
                  <input
                    id={`qty-${item.slug}-${item.size}`}
                    type="number"
                    min={1}
                    max={20}
                    value={item.qty}
                    onChange={(e) => setQty(item.slug, item.size, Number(e.target.value))}
                    className="w-16 border border-ink/20 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => remove(item.slug, item.size)}
                    className="text-xs text-ink/50 underline underline-offset-4 hover:text-ink"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <p className="text-sm tabular-nums">{formatPrice(item.qty * item.price_cents)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-2 text-sm">
          <Row label="Subtotal" value={formatPrice(total)} />
          <Row label="Envío" value={shipping === 0 ? 'Gratis' : formatPrice(shipping)} />
          <Row label="Total" value={formatPrice(total + shipping)} strong />
        </dl>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 self-start bg-sand p-8">
        <h2 className="font-display text-2xl">Datos de envío</h2>

        <Field label="Nombre completo" name="full_name" autoComplete="name" />
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Dirección" name="address" autoComplete="street-address" />

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-ink px-6 py-4 text-sm uppercase tracking-widest text-paper transition hover:bg-ink/85 disabled:bg-ink/30"
        >
          {pending ? 'Procesando…' : `Pagar ${formatPrice(total + shipping)}`}
        </button>
        <p className="text-xs text-ink/50">
          Demo sin pasarela de pago: el pedido se registra pero no se cobra nada.
        </p>
      </form>
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t border-ink/10 pt-2 font-medium' : ''}`}>
      <dt className="text-ink/60">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  autoComplete,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-widest text-ink/50">{label}</span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="w-full border border-ink/20 bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
      />
    </label>
  )
}
