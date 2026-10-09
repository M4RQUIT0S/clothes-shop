'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useCart } from '@/components/cart'
import { ProductImage } from '@/components/product-image'
import { POSTAL_CODE_PATTERN, PROVINCES } from '@/lib/argentina'
import { MAX_ITEM_QUANTITY } from '@/lib/cart'
import { ADDRESS_MAX_LENGTH, EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, POSTAL_CODE_MAX_LENGTH } from '@/lib/checkout-fields'
import { formatPrice, shippingFor } from '@/lib/shop'
import { checkout } from './actions'

export default function CartPage() {
  const { items, setQty, remove, clear, total, warning } = useCart()
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState('')
  const [pending, startTransition] = useTransition()

  const shipping = shippingFor(total)

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await checkout({
        full_name: String(form.get('full_name') ?? ''),
        email: String(form.get('email') ?? ''),
        address: String(form.get('address') ?? ''),
        province: String(form.get('province') ?? ''),
        postal_code: String(form.get('postal_code') ?? ''),
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
          Te enviamos los detalles por email. Tu referencia es{' '}
          <span className="italic text-ink">{orderId.slice(0, 8)}</span>.
        </p>
        <Link href="/#catalogo" className="label mt-10 inline-flex min-h-11 min-w-11 items-center border-b border-ink">
          Seguir comprando
        </Link>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-[2.4rem] font-light">Tu carrito está vacío</h1>
        {warning && <p role="status" className="mt-4 text-muted">{warning}</p>}
        <p className="mt-4 text-muted">Trece prendas esperando. Empezá por donde quieras.</p>
        <Link href="/#catalogo" className="label mt-10 inline-flex min-h-11 min-w-11 items-center border-b border-ink">
          Ver el catálogo
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-20">
      <div className="min-w-0">
        <h1 className="text-[2.4rem] font-light">Carrito</h1>
        {warning && <p role="status" className="mt-4 text-muted">{warning}</p>}

        <ul className="mt-10 divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={`${item.slug}-${item.size}`} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-6 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
              <ProductImage
                src={item.image_url}
                alt={item.name}
                color={item.color}
                sizes="(min-width: 640px) 88px, 64px"
                className="row-span-2 aspect-[3/4] w-16 sm:w-22"
              />
              <div className="min-w-0">
                <Link href={`/producto/${item.slug}`} className="inline-flex min-h-11 items-center text-[1.05rem] hover:italic">
                  {item.name}
                </Link>
                <p className="label mt-1 text-muted">Talle {item.size}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="sr-only" htmlFor={`qty-${item.slug}-${item.size}`}>
                    Cantidad de {item.name}{item.size ? `, talle ${item.size}` : ''}
                  </label>
                  <select
                    id={`qty-${item.slug}-${item.size}`}
                    value={item.qty}
                    disabled={pending}
                    onChange={(e) => setQty(item.slug, item.size, Number(e.target.value))}
                    className="min-h-11 min-w-16 border border-line bg-paper px-2 text-[1rem] disabled:opacity-60"
                  >
                    {Array.from({ length: MAX_ITEM_QUANTITY }, (_, i) => i + 1).map((qty) => (
                      <option key={qty} value={qty}>{qty}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`Quitar ${item.name}${item.size ? `, talle ${item.size}` : ''}`}
                    onClick={() => remove(item.slug, item.size)}
                    className="label min-h-11 px-2 text-muted underline underline-offset-4 hover:text-ink disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <p className="col-start-2 text-[1.05rem] tabular-nums">
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

      <form onSubmit={onSubmit} aria-busy={pending} className="min-w-0 self-start">
        <h2 className="text-[1.6rem] font-light">Datos de envío</h2>

        <div className="mt-8 space-y-7">
          <Field label="Nombre completo" name="full_name" autoComplete="name" minLength={2} maxLength={NAME_MAX_LENGTH} />
          <Field label="Email" name="email" type="email" autoComplete="email" maxLength={EMAIL_MAX_LENGTH} />
          <Field label="Calle y número" name="address" autoComplete="street-address" maxLength={ADDRESS_MAX_LENGTH} />

          <label className="block">
            <span className="label mb-2 block text-muted">Provincia</span>
            <select
              name="province"
              required
              defaultValue=""
              autoComplete="address-level1"
              className="min-h-11 w-full border-b border-line bg-transparent pb-2 text-[1.05rem] focus:border-ink"
            >
              <option value="" disabled>
                Elegí tu provincia
              </option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <Field
            label="Código postal"
            name="postal_code"
            autoComplete="postal-code"
            pattern={POSTAL_CODE_PATTERN}
            maxLength={POSTAL_CODE_MAX_LENGTH}
            hint="CPA (C1425DKE) o los cuatro dígitos de siempre (1425)"
          />
        </div>

        {error && (
          <p role="alert" className="mt-6 text-[1rem] italic text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="label mt-10 w-full bg-ink py-4 text-paper transition-colors duration-300 ease-out hover:bg-ink/85 disabled:bg-line disabled:text-muted"
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
  pattern,
  hint,
  minLength,
  maxLength,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  pattern?: string
  hint?: string
  minLength?: number
  maxLength?: number
}) {
  return (
    <label className="block">
      <span className="label mb-2 block text-muted">{label}</span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        pattern={pattern}
        minLength={minLength}
        maxLength={maxLength}
        // sin title, el globo de validación del navegador dice «coincide con el
        // formato solicitado» y no cuenta cuál es. Con él, repite la pista.
        title={hint}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className="min-h-11 w-full border-b border-line bg-transparent pb-2 text-[1.05rem] focus:border-ink"
      />
      {hint && (
        <span id={`${name}-hint`} className="meta mt-2 block text-muted">
          {hint}
        </span>
      )}
    </label>
  )
}
