'use client'

import { useEffect, useState } from 'react'
import { useCart, type CartItem } from './cart'
import { PENDING_ORDER_KEY, parsePendingOrder } from '@/lib/pending-order'

/**
 * Al volver al recibo, quita del carrito lo que se pidió desde este navegador, sólo si
 * el pedido quedó en firme. Si mientras tanto alguna de esas líneas cambió en otra
 * pestaña, se conserva y se avisa. Si el pago falló, el carrito queda como estaba.
 */
export function ReceiptCart({ orderId, placed }: { orderId: string; placed: boolean }) {
  const { consumeOrder, ready, ownerId } = useCart()
  const [kept, setKept] = useState<CartItem[]>([])

  useEffect(() => {
    if (!placed || !ready) return
    let raw: string | null = null
    try { raw = localStorage.getItem(PENDING_ORDER_KEY) } catch { return }
    const pending = parsePendingOrder(raw)
    if (!pending || pending.orderId !== orderId || (pending.ownerId ?? null) !== ownerId) return
    // Se borra primero: si algo falla después, no se vuelve a consumir en otra visita.
    try { localStorage.removeItem(PENDING_ORDER_KEY) } catch { return }
    const changed = consumeOrder(pending.lines)
    // El aviso depende de lo que había en el carrito del navegador, no del servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (changed.length) setKept(changed)
  }, [orderId, placed, consumeOrder, ready, ownerId])

  if (!kept.length) return null
  return (
    <p role="status" className="mt-6 text-[1rem] italic text-ink">
      Este pedido ya incluye lo que confirmaste. Dejamos en tu carrito{' '}
      {kept.map((item) => `${item.name}${item.size ? ` (talle ${item.size})` : ''}`).join(', ')}{' '}
      porque cambió mientras confirmabas: revisá las cantidades antes de volver a comprarlo.
    </p>
  )
}
