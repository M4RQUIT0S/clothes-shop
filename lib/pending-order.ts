import { MAX_CART_LINES, MAX_ITEM_QUANTITY, type OrderedLine } from './cart.ts'

/**
 * Pedido que salió hacia Mercado Pago desde este navegador. Al volver al recibo sirve
 * para quitar del carrito exactamente lo que se pidió. Sin datos personales: sólo la
 * referencia, el enlace al recibo y las líneas.
 */
export type PendingOrder = { orderId: string; receiptPath: string; lines: OrderedLine[]; ownerId?: string | null }

export const PENDING_ORDER_KEY = 'clothes-shop-pending-order'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const serializePendingOrder = ({ orderId, receiptPath, lines, ownerId }: PendingOrder) =>
  JSON.stringify({ orderId, receiptPath, lines: lines.map(({ slug, size, qty }) => ({ slug, size, qty })), ...(ownerId !== undefined ? { ownerId } : {}) })

export function parsePendingOrder(raw: string | null): PendingOrder | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<PendingOrder>
    const validLine = (l: Partial<OrderedLine>) =>
      typeof l?.slug === 'string' && typeof l.size === 'string'
      && Number.isInteger(l.qty) && l.qty! >= 1 && l.qty! <= MAX_ITEM_QUANTITY
    // Sólo rutas propias: nunca una URL absoluta ni //otro-sitio que lleve fuera de la tienda.
    if (typeof value?.orderId !== 'string' || !UUID.test(value.orderId)
      || typeof value.receiptPath !== 'string' || !value.receiptPath.startsWith(`/pedido/${value.orderId}?`)
      || !Array.isArray(value.lines) || value.lines.length > MAX_CART_LINES || !value.lines.every(validLine)) {
      return null
    }
    if (value.ownerId != null && (typeof value.ownerId !== 'string' || !UUID.test(value.ownerId))) return null
    return { orderId: value.orderId, receiptPath: value.receiptPath, lines: value.lines, ...(value.ownerId !== undefined ? { ownerId: value.ownerId } : {}) }
  } catch {
    return null
  }
}
