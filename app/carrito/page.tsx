'use client'

import Link from 'next/link'
import { unstable_rethrow } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useCart } from '@/components/cart'
import { ProductImage } from '@/components/product-image'
import { POSTAL_CODE_PATTERN, PROVINCES } from '@/lib/argentina'
import { MAX_ITEM_QUANTITY, sameLine } from '@/lib/cart'
import { ADDRESS_MAX_LENGTH, EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, POSTAL_CODE_MAX_LENGTH } from '@/lib/checkout-fields'
import type { LineProblem } from '@/lib/checkout/quote'
import { PENDING_ORDER_KEY, parsePendingOrder, serializePendingOrder } from '@/lib/pending-order'
import { formatPrice, shippingFor } from '@/lib/shop'
import { placeOrderAction, type PlaceOrderInput, type PlaceOrderResult, type QuoteResult } from './actions'
import { useQuote } from './use-quote'

type Notice = { tone: 'error' | 'info'; text: string }

/**
 * Fases del envío. `locked` cubre el resultado incierto (se cortó la conexión) y los
 * fallos tras registrar: el pedido pudo quedar guardado, así que sólo se reintenta con
 * la misma clave y los mismos datos, nunca con datos editados.
 */
type Phase = 'idle' | 'sending' | 'locked' | 'redirecting'

const problemText = (p: LineProblem) => ({
  not_found: 'Esta prenda ya no está a la venta. Quitala para seguir.',
  size_not_sold: 'Este talle ya no se vende. Quitalo para seguir.',
  sold_out: 'Este talle se agotó. Quitalo para seguir.',
  insufficient: `Sólo ${p.available === 1 ? 'queda 1' : `quedan ${p.available}`}. Bajá la cantidad para seguir.`,
})[p.reason]

export default function CartPage() {
  const { items, setQty, remove, total: localTotal, warning, syncPrices, ready, sync, retrySync, ownerId } = useCart()
  const [phase, setPhase] = useState<Phase>('idle')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [attempt, setAttempt] = useState<PlaceOrderInput | null>(null)
  const [, startTransition] = useTransition()
  const [pendingReceipt, setPendingReceipt] = useState<string | null>(null)

  // Al volver con «Atrás» desde Mercado Pago, el navegador puede restaurar esta página
  // tal como quedó (bfcache), con todo bloqueado en «Yendo a Mercado Pago…». Se libera;
  // el intento conserva su clave, así que confirmar de nuevo devuelve el mismo pedido.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPhase((current) => (current === 'redirecting' ? 'idle' : current))
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  // Un pedido que salió hacia Mercado Pago desde este navegador: si el comprador no volvió
  // por la redirección, este enlace es su camino de vuelta al recibo.
  useEffect(() => {
    if (!ready) return
    let raw: string | null = null
    try { raw = localStorage.getItem(PENDING_ORDER_KEY) } catch { return }
    const pending = parsePendingOrder(raw)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingReceipt(pending && (pending.ownerId ?? null) === ownerId ? pending.receiptPath : null)
  }, [ready, ownerId])

  const onQuoted = (result: QuoteResult) => { if (result.ok) syncPrices(result.quote.lines) }
  const quote = useQuote(items, onQuoted)
  const quoted = quote.result?.ok ? quote.result : null
  const problems = quoted?.problems ?? []
  const busy = phase !== 'idle'

  // Mientras llega la cotización se muestra la estimación local, pero no se puede pagar.
  const subtotal = quoted ? quoted.quote.subtotal_cents : localTotal
  const shipping = quoted ? quoted.quote.shipping_cents : shippingFor(localTotal)
  const total = quoted ? quoted.quote.total_cents : localTotal + shipping
  const canPay = Boolean(quoted) && problems.length === 0 && !busy
  const quoteFailed = quote.result?.ok === false

  const handle = (result: PlaceOrderResult, payload: PlaceOrderInput) => {
    if (result.ok) {
      try {
        const receipt = new URL(result.receiptUrl)
        localStorage.setItem(PENDING_ORDER_KEY, serializePendingOrder({
          orderId: result.orderId,
          receiptPath: receipt.pathname + receipt.search,
          lines: payload.items,
          ownerId,
        }))
      } catch {
        // Sin almacenamiento, el recibo igual funciona; sólo no se podrá vaciar el carrito solo.
      }
      setPhase('redirecting')
      window.location.assign(result.paymentUrl)
      return
    }
    if (result.code === 'QUOTE_CHANGED' || result.code === 'UNAVAILABLE') {
      // No se registró nada: la cotización nueva reemplaza a la vieja y hay que volver a confirmar.
      quote.replace({ ok: true, quote: result.quote, fingerprint: result.fingerprint, problems: result.code === 'UNAVAILABLE' ? result.problems : [] })
      syncPrices(result.quote.lines)
      setAttempt(null)
      setPhase('idle')
      setNotice(result.code === 'QUOTE_CHANGED'
        ? { tone: 'info', text: `El total cambió desde que lo viste: ahora es ${formatPrice(result.quote.total_cents)}. Revisalo y confirmá de nuevo.` }
        : { tone: 'error', text: result.error })
      return
    }
    if (result.code === 'PAYMENT_UNAVAILABLE' || result.code === 'ERROR') {
      setPhase('locked')
      setNotice({ tone: 'error', text: result.error })
      return
    }
    setAttempt(null)
    setPhase('idle')
    setNotice({ tone: 'error', text: result.error })
  }

  const send = (payload: PlaceOrderInput) => {
    setPhase('sending')
    setNotice(null)
    startTransition(async () => {
      let result: PlaceOrderResult
      try {
        result = await placeOrderAction(payload)
      } catch (error) {
        unstable_rethrow(error)
        setPhase('locked')
        setNotice({ tone: 'error', text: 'Se cortó la conexión y no sabemos si el pedido llegó a registrarse. Reintentá: si ya estaba registrado, no se va a duplicar.' })
        return
      }
      handle(result, payload)
    })
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!quoted || !canPay) return
    const form = new FormData(event.currentTarget)
    const payload: PlaceOrderInput = {
      full_name: String(form.get('full_name') ?? ''),
      email: String(form.get('email') ?? ''),
      address: String(form.get('address') ?? ''),
      province: String(form.get('province') ?? ''),
      postal_code: String(form.get('postal_code') ?? ''),
      items: items.map(({ slug, size, qty }) => ({ slug, size, qty })),
      accepted_fingerprint: quoted.fingerprint,
      // Una clave por intento de compra: los reintentos de este mismo intento la reutilizan.
      idempotency_key: attempt?.idempotency_key ?? crypto.randomUUID(),
    }
    setAttempt(payload)
    send(payload)
  }

  if (!ready) return <section className="px-6 py-24 text-center"><p role="status">Recuperando tu carrito…</p></section>

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-[2.4rem] font-light">Tu carrito está vacío</h1>
        {warning && <p role="status" className="mt-4 text-muted">{warning}</p>}
        {pendingReceipt && <PendingOrderLink href={pendingReceipt} />}
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
        <p role="status" className="meta mt-3 text-muted">
          {ownerId ? sync === 'syncing' ? 'Sincronizando con tu cuenta…' : sync === 'error' ? 'Hay cambios pendientes de sincronizar.' : 'Guardado en tu cuenta.' : 'Guardado en este navegador.'}
        </p>
        {sync === 'error' && <button type="button" onClick={() => void retrySync()} className="meta mt-2 min-h-11 underline underline-offset-4">Reintentar sincronización</button>}
        {!ownerId && <Link href="/cuenta" className="meta mt-2 inline-flex min-h-11 items-center underline underline-offset-4">Iniciá sesión para guardar tu carrito en tu cuenta</Link>}
        {warning && <p role="status" className="mt-4 text-muted">{warning}</p>}
        {pendingReceipt && <PendingOrderLink href={pendingReceipt} />}

        <ul className="mt-10 divide-y divide-line border-y border-line">
          {items.map((item) => {
            const problem = problems.find((p) => sameLine(item, p.slug, p.size))
            const line = quoted?.quote.lines.find((l) => sameLine(item, l.slug, l.size))
            return (
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
                  {item.size && <p className="label mt-1 text-muted">Talle {item.size}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="sr-only" htmlFor={`qty-${item.slug}-${item.size}`}>
                      Cantidad de {item.name}{item.size ? `, talle ${item.size}` : ''}
                    </label>
                    <select
                      id={`qty-${item.slug}-${item.size}`}
                      value={item.qty}
                      disabled={busy}
                      onChange={(e) => setQty(item.slug, item.size, Number(e.target.value))}
                      className="min-h-11 min-w-16 border border-line bg-paper px-2 text-[1rem] disabled:opacity-60"
                    >
                      {Array.from({ length: MAX_ITEM_QUANTITY }, (_, i) => i + 1).map((qty) => (
                        <option key={qty} value={qty}>{qty}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Quitar ${item.name}${item.size ? `, talle ${item.size}` : ''}`}
                      onClick={() => remove(item.slug, item.size)}
                      className="label min-h-11 px-2 text-muted underline underline-offset-4 hover:text-ink disabled:opacity-60"
                    >
                      Quitar
                    </button>
                  </div>
                  {problem && (
                    <p className="mt-3 text-[0.95rem] italic text-red-800">
                      {problemText(problem)}{' '}
                      {problem.reason === 'insufficient' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setQty(item.slug, item.size, problem.available)}
                          className="label inline-flex min-h-11 items-center not-italic text-ink underline underline-offset-4"
                        >
                          Dejar {problem.available}
                        </button>
                      )}
                    </p>
                  )}
                </div>
                <p className="col-start-2 text-[1.05rem] tabular-nums">
                  {formatPrice(line ? line.line_total_cents : item.qty * item.price_cents)}
                </p>
              </li>
            )
          })}
        </ul>

        {/* Con líneas que no se pueden vender, la cotización las deja fuera: mostrar ese
            total parcial (o un envío «gratis» de cero) sería engañoso. */}
        <dl className="mt-8 space-y-3 text-[1.05rem]">
          <Row label="Subtotal" value={problems.length ? '—' : formatPrice(subtotal)} />
          <Row label="Envío" value={problems.length ? '—' : shipping === 0 ? 'Gratis' : formatPrice(shipping)} />
          <Row label="Total" value={problems.length ? 'Revisá el carrito' : quoted ? formatPrice(total) : quoteFailed ? 'Sin calcular' : 'Calculando…'} strong />
        </dl>
        {quote.result && !quote.result.ok && (
          <p role="alert" className="mt-4 text-[1rem] italic text-red-800">
            {quote.result.error}{' '}
            <button type="button" onClick={quote.retry} className="label inline-flex min-h-11 items-center not-italic text-ink underline underline-offset-4">
              Reintentar
            </button>
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} aria-busy={phase === 'sending' || phase === 'redirecting'} className="min-w-0 self-start">
        <h2 className="text-[1.6rem] font-light">Datos de envío</h2>

        {/* Con el formulario bloqueado, reintentar reenvía exactamente lo mismo. */}
        <fieldset disabled={busy} className="mt-8 space-y-7 disabled:opacity-80">
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
        </fieldset>

        <p className="mt-6 font-sans text-sm leading-relaxed text-muted">
          Usamos tus datos para gestionar el pedido. Podés leer la{' '}
          <Link href="/privacidad" className="inline-flex min-h-11 items-center text-ink underline underline-offset-4">política de privacidad</Link>
          {', la '}
          <Link href="/cookies" className="inline-flex min-h-11 items-center text-ink underline underline-offset-4">política de cookies</Link>
          {' '}y los{' '}
          <Link href="/terminos" className="inline-flex min-h-11 items-center text-ink underline underline-offset-4">términos y condiciones de compra</Link>.
          {' '}Estos textos son borradores con datos pendientes de completar.
        </p>

        {/* Regiones vivas siempre montadas: un lector de pantalla anuncia de forma fiable
            el cambio de texto, no un elemento que aparece ya lleno. */}
        <p role="alert" aria-atomic="true" className={notice?.tone === 'error' ? 'mt-6 text-[1rem] italic text-red-800' : 'sr-only'}>
          {notice?.tone === 'error' ? notice.text : ''}
        </p>
        <p role="status" aria-atomic="true" className={notice?.tone === 'info' ? 'mt-6 text-[1rem] italic text-ink' : 'sr-only'}>
          {notice?.tone === 'info' ? notice.text : ''}
          {/* Los problemas por línea se ven junto a cada prenda; aquí sólo se anuncian. */}
          {problems.length > 0 && (
            <span className="sr-only">
              {' '}{problems.length === 1 ? 'Una prenda necesita cambios' : `${problems.length} prendas necesitan cambios`} antes de pagar: revisá el carrito.
            </span>
          )}
        </p>

        {phase === 'locked' && attempt ? (
          <button
            type="button"
            onClick={() => send(attempt)}
            className="label mt-10 w-full bg-ink py-4 text-paper transition-colors duration-300 ease-out hover:bg-ink/85"
          >
            Reintentar
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canPay}
            className="label mt-10 w-full bg-ink py-4 text-paper transition-colors duration-300 ease-out hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            {phase === 'sending' ? 'Registrando el pedido…'
              : phase === 'redirecting' ? 'Yendo a Mercado Pago…'
                : problems.length ? 'Revisá el carrito para seguir'
                  : quoted ? `Ir a pagar ${formatPrice(total)}`
                    : quoteFailed ? 'No pudimos calcular el total' : 'Calculando el total…'}
          </button>
        )}
        {phase === 'locked' && (
          // Salida del bloqueo: si el intento anterior sí quedó registrado, queda como un
          // pedido sin pagar que vence solo; lo que nunca puede pasar es cobrar dos veces.
          <button
            type="button"
            onClick={() => {
              setAttempt(null)
              setPhase('idle')
              setNotice({ tone: 'info', text: 'Podés corregir los datos y confirmar de nuevo. Si el intento anterior llegó a registrarse, queda sin pagar y no se cobra.' })
            }}
            className="label mt-3 inline-flex min-h-11 w-full items-center justify-center text-ink underline underline-offset-4"
          >
            Editar el pedido
          </button>
        )}

        <p className="mt-4 text-[0.95rem] italic text-muted">
          Vas a pagar en Mercado Pago: los datos de tu tarjeta no pasan por esta tienda.
        </p>
      </form>
    </section>
  )
}

function PendingOrderLink({ href }: { href: string }) {
  return (
    <p className="mt-4 text-[1rem] text-muted">
      Tenés un pedido que empezaste a pagar.{' '}
      <Link href={href} className="inline-flex min-h-11 items-center text-ink underline underline-offset-4">Ver su estado</Link>
    </p>
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
