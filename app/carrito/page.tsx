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
      <section className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-[2.4rem] font-light">Pedido confirmado</h1>
        <p className="mt-5 text-[1.1rem] text-muted">
          Te hemos enviado los detalles por email. Tu referencia es{' '}
          <span className="italic text-ink">{orderId.slice(0, 8)}</span>.
        </p>
        <Link href="/" className="label mt-10 inline-block border-b border-ink pb-1">
          Seguir comprando
        </Link>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-[2.4rem] font-light">Tu cesta está vacía</h1>
        <p className="mt-4 text-muted">Trece prendas esperando. Empieza por donde quieras.</p>
        <Link href="/" className="label mt-10 inline-block border-b border-ink pb-1">
          Ver el catálogo
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-20 px-6 py-16 md:grid-cols-[1.15fr_1fr]">
      <div>
        <h1 className="text-[2.4rem] font-light">Cesta</h1>

        <ul className="mt-10 divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={`${item.slug}-${item.size}`} className="flex gap-5 py-6">
              <ProductImage
                src={item.image_url}
                alt={item.name}
                color={item.color}
                sizes="88px"
                className="aspect-[3/4] w-22 shrink-0"
              />
              <div className="flex-1">
                <Link href={`/producto/${item.slug}`} className="text-[1.05rem] hover:italic">
                  {item.name}
                </Link>
                <p className="label mt-1 text-muted">Talla {item.size}</p>
                <div className="mt-4 flex items-center gap-4">
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
                    className="w-14 border-b border-line bg-transparent pb-1 text-center text-[1rem] outline-none focus:border-ink"
                  />
                  <button
                    type="button"
                    onClick={() => remove(item.slug, item.size)}
                    className="label text-muted underline underline-offset-4 hover:text-ink"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <p className="text-[1.05rem] tabular-nums">
                {formatPrice(item.qty * item.price_cents)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-8 space-y-3 text-[1.05rem]">
          <Row label="Subtotal" value={formatPrice(total)} />
          <Row label="Envío" value={shipping === 0 ? 'Gratis' : formatPrice(shipping)} />
          <Row label="Total" value={formatPrice(total + shipping)} strong />
        </dl>
      </div>

      <form onSubmit={onSubmit} className="self-start">
        <h2 className="text-[1.6rem] font-light">Datos de envío</h2>

        <div className="mt-8 space-y-7">
          <Field label="Nombre completo" name="full_name" autoComplete="name" />
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field label="Dirección" name="address" autoComplete="street-address" />
        </div>

        {error && (
          <p role="alert" className="mt-6 text-[1rem] italic text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="label mt-10 w-full bg-ink py-4 text-paper transition hover:bg-ink/85 disabled:bg-line disabled:text-muted"
        >
          {pending ? 'Procesando…' : `Pagar ${formatPrice(total + shipping)}`}
        </button>

        <p className="mt-4 text-[0.95rem] italic text-muted">
          Demo sin pasarela de pago: el pedido se registra pero no se cobra nada.
        </p>
      </form>
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t border-line pt-3' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
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
      <span className="label mb-2 block text-muted">{label}</span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="w-full border-b border-line bg-transparent pb-2 text-[1.05rem] outline-none focus:border-ink"
      />
    </label>
  )
}
