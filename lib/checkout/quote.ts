import { shippingFor, unitPrice } from '../shop.ts'

/** Lo que el servidor necesita de cada prenda para cotizar: precio vigente y stock por talle. */
export type QuoteProduct = {
  slug: string
  name: string
  price_cents: number
  sale_price_cents: number | null
  sizes: string[]
  variants: { size: string; stock: number }[]
}

export type QuoteItem = { slug: string; size: string; qty: number }

export type QuoteLine = QuoteItem & { name: string; unit_price_cents: number; line_total_cents: number }

export type Quote = {
  lines: QuoteLine[]
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
}

export type LineProblem = {
  slug: string
  size: string
  reason: 'not_found' | 'size_not_sold' | 'sold_out' | 'insufficient'
  /** Unidades que sí quedan en ese talle (0 si no se vende). */
  available: number
}

/**
 * Cotiza el carrito con los datos de la base: el navegador sólo dice qué y cuánto.
 * Las líneas que no se pueden vender salen en `problems` y quedan fuera de la
 * cotización, para mostrar ambas cosas juntas. Un talle listado en `sizes` pero sin
 * fila de stock cuenta como agotado: lo que no está cargado no se vende.
 */
export function buildQuote(products: QuoteProduct[], items: QuoteItem[]): { quote: Quote; problems: LineProblem[] } {
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const lines: QuoteLine[] = []
  const problems: LineProblem[] = []

  for (const { slug, size, qty } of items) {
    const product = bySlug.get(slug)
    if (!product) {
      problems.push({ slug, size, reason: 'not_found', available: 0 })
      continue
    }
    // Sin talles listados, la prenda es de talle único y se vende como ''.
    const sold = product.sizes.length ? product.sizes : ['']
    if (!sold.includes(size)) {
      problems.push({ slug, size, reason: 'size_not_sold', available: 0 })
      continue
    }
    const available = product.variants.find((v) => v.size === size)?.stock ?? 0
    if (available < 1) {
      problems.push({ slug, size, reason: 'sold_out', available: 0 })
      continue
    }
    if (qty > available) {
      problems.push({ slug, size, reason: 'insufficient', available })
      continue
    }
    const unit_price_cents = unitPrice(product)
    lines.push({ slug, size, qty, name: product.name, unit_price_cents, line_total_cents: unit_price_cents * qty })
  }

  const subtotal_cents = lines.reduce((sum, line) => sum + line.line_total_cents, 0)
  const shipping_cents = shippingFor(subtotal_cents)
  return { quote: { lines, subtotal_cents, shipping_cents, total_cents: subtotal_cents + shipping_cents }, problems }
}

/**
 * Huella de lo que se cobra. El comprador acepta una cotización devolviendo su huella;
 * si al confirmar no coincide con la recalculada, algo que cambia el importe cambió.
 * No es un secreto ni una firma: el servidor siempre recalcula, esto sólo detecta la
 * diferencia. El nombre no entra porque renombrar una prenda no cambia lo que se paga.
 */
export function quoteFingerprint(quote: Quote): string {
  return JSON.stringify([
    quote.lines.map((l) => [l.slug, l.size, l.qty, l.unit_price_cents]),
    quote.shipping_cents,
    quote.total_cents,
  ])
}
