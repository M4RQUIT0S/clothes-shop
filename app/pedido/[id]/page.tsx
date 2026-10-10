import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { ReceiptCart } from '@/components/receipt-cart'
import { verifyReceiptToken } from '@/lib/checkout/receipt-token'
import { readCheckoutConfig } from '@/lib/checkout/server-config'
import { checkoutServices } from '@/lib/checkout/services'
import { loadReceiptOrder, type ReceiptOrder } from '@/lib/checkout/supabase-store'
import { formatPrice } from '@/lib/shop'

export const metadata: Metadata = {
  title: 'Tu pedido — Hilo',
  // El enlace lleva la llave del recibo: que no se indexe ni viaje como Referer.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OPEN = new Set(['awaiting_payment', 'payment_failed'])

export default async function ReceiptPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string | string[] }>
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams])
  const config = readCheckoutConfig()
  if (!config.ok) {
    console.error('Recibo sin configurar, faltan:', config.missing.join(', '))
    throw new Error('No pudimos mostrar el recibo en este momento.')
  }
  // Un enlace sin llave válida da el mismo 404 que un pedido inexistente: no se revela nada.
  if (!UUID.test(id) || !verifyReceiptToken(config.config.receiptSecret, id, t)) notFound()

  const services = checkoutServices(config.config)
  let order = await loadReceiptOrder(services.db, id)
  if (!order) notFound()

  // Pedido abierto: el estado se relee de Mercado Pago en cada visita, sin creer lo que
  // diga la URL de vuelta. Si Mercado Pago no responde, se muestra lo último que se sabe.
  if (OPEN.has(order.status) && order.mp_order_id) {
    try {
      await services.sync(order.mp_order_id, id)
      order = (await loadReceiptOrder(services.db, id)) ?? order
    } catch (error) {
      console.error('No se pudo actualizar el pago del pedido', id, error)
    }
  }
  // Pagado sin correo (porque falló antes): se reintenta después de responder.
  if (order.status === 'paid' && !order.email_sent_at) {
    after(() => services.sendConfirmation(id).catch((error) => console.error('Correo del pedido', id, error)))
  }

  return <Receipt order={order} />
}

function statusCopy(order: ReceiptOrder, emailConfigured: boolean) {
  switch (order.status) {
    case 'paid':
      return {
        title: 'Pago recibido',
        body: order.email_sent_at
          ? `Te mandamos el comprobante a ${order.email}. Preparamos el pedido y te avisamos cuando salga.`
          : emailConfigured
            ? 'Preparamos el pedido. El correo con el comprobante puede tardar unos minutos; mientras tanto, este recibo vale.'
            : 'Preparamos el pedido. Guardá este enlace: es tu comprobante.',
      }
    case 'needs_review':
      return {
        title: 'Estamos revisando tu pedido',
        body: 'Recibimos el pago, pero necesitamos revisar algo antes de prepararlo (por ejemplo, que un talle se agotó mientras pagabas). Te escribimos a la brevedad; si no podemos enviarlo, te devolvemos el dinero.',
      }
    case 'payment_failed':
      return {
        title: 'El pago no se completó',
        body: 'Mercado Pago no aprobó el pago. Tu pedido sigue reservado a tu nombre: podés intentarlo de nuevo con otro medio.',
      }
    case 'awaiting_payment':
      return order.payment_status
        ? {
          title: 'Pago pendiente',
          body: 'Mercado Pago todavía no acreditó el pago (por ejemplo, si elegiste pagar en efectivo). Volvé a abrir este enlace más tarde para ver el estado.',
        }
        : {
          title: 'Esperando el pago',
          body: 'Todavía no recibimos el pago de este pedido.',
        }
    default:
      return { title: 'Pedido de prueba', body: 'Este pedido se registró en la demo anterior: no se realizó ningún cobro.' }
  }
}

function Receipt({ order }: { order: ReceiptOrder }) {
  const copy = statusCopy(order, Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM))
  const canPay = (order.status === 'awaiting_payment' || order.status === 'payment_failed') && order.payment_url
  // El carrito se vacía de lo pedido cuando el pedido quedó en firme: pagado o con un pago en curso.
  const placed = order.status === 'paid' || order.status === 'needs_review'
    || (order.status === 'awaiting_payment' && Boolean(order.payment_status))

  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <p className="label text-muted">Pedido</p>
      <h1 className="mt-3 text-[2.4rem] font-light">{copy.title}</h1>
      <p className="mt-5 text-[1.1rem] leading-relaxed text-muted">{copy.body}</p>

      <ReceiptCart orderId={order.id} placed={placed} />

      <ul className="mt-10 divide-y divide-line border-y border-line">
        {order.items.map((line) => (
          <li key={`${line.slug}-${line.size}`} className="flex justify-between gap-4 py-4 text-[1.05rem]">
            <span>
              {line.name}
              {line.size && <span className="text-muted">, talle {line.size}</span>}
              <span className="text-muted"> × {line.qty}</span>
            </span>
            <span className="tabular-nums">{formatPrice(line.qty * line.unit_price_cents)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-3 text-[1.05rem]">
        <Row label="Subtotal" value={formatPrice(order.subtotal_cents)} />
        <Row label="Envío" value={order.shipping_cents === 0 ? 'Gratis' : formatPrice(order.shipping_cents)} />
        <Row label={order.status === 'paid' ? 'Total pagado' : 'Total'} value={formatPrice(order.total_cents)} strong />
      </dl>

      <p className="meta mt-8 break-all text-muted">Referencia: {order.id}</p>

      <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2">
        {canPay && (
          <a href={order.payment_url!} className="label inline-flex min-h-11 items-center border-b border-ink">
            {order.status === 'payment_failed' ? 'Intentar el pago de nuevo' : 'Ir a pagar'}
          </a>
        )}
        <Link href="/#catalogo" className="label inline-flex min-h-11 min-w-11 items-center border-b border-ink">
          Seguir comprando
        </Link>
      </div>
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
