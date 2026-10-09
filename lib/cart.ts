export const MAX_ITEM_QUANTITY = 20
export const MAX_CART_LINES = 50

export type CartItem = {
  slug: string
  name: string
  size: string
  price_cents: number
  image_url: string
  color: string
  qty: number
}

export const sameLine = (item: CartItem, slug: string, size: string) =>
  item.slug === slug && item.size === size

const validQuantity = (qty: number) =>
  Number.isInteger(qty) && qty >= 1 && qty <= MAX_ITEM_QUANTITY

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.slug === 'string' && item.slug.length > 0 && item.slug.length <= 120
    && typeof item.name === 'string' && item.name.length > 0
    && typeof item.size === 'string' && item.size.length <= 20
    && typeof item.image_url === 'string' && typeof item.color === 'string'
    && typeof item.price_cents === 'number' && Number.isSafeInteger(item.price_cents) && item.price_cents > 0
    && typeof item.qty === 'number' && validQuantity(item.qty)
}

export function readSavedCart(raw: string | null): { items: CartItem[]; warning?: string } {
  if (raw === null) return { items: [] }
  const warning = 'No pudimos recuperar algunas prendas guardadas. Revisá tu carrito antes de continuar.'
  try {
    const saved: unknown = JSON.parse(raw)
    if (!Array.isArray(saved)) return { items: [], warning }
    const items = saved.reduce<CartItem[]>((valid, item) => {
      if (!isCartItem(item) || valid.length >= MAX_CART_LINES
        || valid.some((line) => sameLine(line, item.slug, item.size))) return valid
      return [...valid, item]
    }, [])
    return items.length === saved.length ? { items } : { items, warning }
  } catch {
    return { items: [], warning }
  }
}

export function setCartQuantity(items: CartItem[], slug: string, size: string, qty: number) {
  if (!validQuantity(qty)) return items
  return items.map((item) => sameLine(item, slug, size) ? { ...item, qty } : item)
}

export function addCartItem(items: CartItem[], item: CartItem): { items: CartItem[]; error?: string } {
  const existing = items.find((line) => sameLine(line, item.slug, item.size))
  if (!validQuantity(item.qty) || (existing?.qty ?? 0) + item.qty > MAX_ITEM_QUANTITY) {
    return { items, error: `Podés agregar hasta ${MAX_ITEM_QUANTITY} unidades por prenda y talle.` }
  }
  if (!existing && items.length >= MAX_CART_LINES) {
    return { items, error: `El carrito admite hasta ${MAX_CART_LINES} prendas y talles diferentes.` }
  }
  return {
    items: existing
      ? items.map((line) => sameLine(line, item.slug, item.size)
        ? { ...line, qty: line.qty + item.qty } : line)
      : [...items, item],
  }
}

export type OrderedLine = Pick<CartItem, 'slug' | 'size' | 'qty'>

/**
 * Cierra un pedido sobre el carrito actual, que pudo cambiar en otra pestaña mientras
 * se confirmaba. Sólo se quitan las líneas que siguen exactamente como se pidieron;
 * las que cambiaron de cantidad se conservan y se devuelven en `changed` para avisar.
 * Restar a ciegas dejaría cantidades que nadie eligió.
 */
export function removeOrderedLines(items: CartItem[], ordered: OrderedLine[]): { items: CartItem[]; changed: CartItem[] } {
  const isOrderedAsIs = (item: CartItem) =>
    ordered.some((line) => sameLine(item, line.slug, line.size) && item.qty === line.qty)
  const wasOrdered = (item: CartItem) => ordered.some((line) => sameLine(item, line.slug, line.size))
  return {
    items: items.filter((item) => !isOrderedAsIs(item)),
    changed: items.filter((item) => wasOrdered(item) && !isOrderedAsIs(item)),
  }
}
