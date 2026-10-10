import { MAX_CART_LINES, MAX_ITEM_QUANTITY, sameLine, type OrderedLine, type CartItem } from './cart.ts'

export type CartOperation = {
  id: string
  kind: 'add' | 'set' | 'remove' | 'merge' | 'consume' | 'clear'
  lines: OrderedLine[]
  createdAt: number
}

/** Sólo referencias y cantidades viajan al servidor; los importes nunca se confían al cliente. */
export const cartLines = (items: OrderedLine[]): OrderedLine[] => items.map(({ slug, size, qty }) => ({ slug, size, qty }))

export function applyCartOperation(current: OrderedLine[], operation: CartOperation): OrderedLine[] {
  if (operation.kind === 'clear') return []
  return operation.lines.reduce((items, line) => {
    const matches = (item: OrderedLine) => sameLine(item, line.slug, line.size)
    const previous = items.find(matches)
    if (operation.kind === 'remove' || (operation.kind === 'consume' && previous?.qty === line.qty)) {
      return items.filter((item) => !matches(item))
    }
    if (operation.kind === 'consume') return items
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_ITEM_QUANTITY) return items
    const qty = operation.kind === 'add' ? Math.min(MAX_ITEM_QUANTITY, (previous?.qty ?? 0) + line.qty)
      : operation.kind === 'merge' ? Math.max(previous?.qty ?? 0, line.qty) : line.qty
    if (previous) return items.map((item) => matches(item) ? { ...item, qty } : item)
    return items.length < MAX_CART_LINES ? [...items, { ...line, qty }] : items
  }, current)
}

export function presentCart(lines: OrderedLine[], catalog: CartItem[]): CartItem[] {
  return lines.map((line) => {
    const product = catalog.findLast((item) => item.slug === line.slug)
    return {
      slug: line.slug, size: line.size, qty: line.qty,
      name: product?.name ?? 'Prenda no disponible',
      price_cents: product?.price_cents ?? 1,
      image_url: product?.image_url ?? '', color: product?.color ?? '#706c5e',
    }
  })
}

export function parseOperation(raw: string): CartOperation | null {
  try {
    const op = JSON.parse(raw) as CartOperation
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(op.id) || !['add', 'set', 'remove', 'merge', 'consume', 'clear'].includes(op.kind)
      || !Number.isSafeInteger(op.createdAt) || !Array.isArray(op.lines) || op.lines.length > MAX_CART_LINES
      || !op.lines.every((line) => typeof line.slug === 'string' && line.slug.length > 0 && line.slug.length <= 120
        && typeof line.size === 'string' && line.size.length <= 20 && Number.isInteger(line.qty)
        && line.qty >= (op.kind === 'remove' ? 0 : 1) && line.qty <= MAX_ITEM_QUANTITY)) return null
    return op
  } catch { return null }
}
