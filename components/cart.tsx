'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'
import { createCartStore } from '@/lib/cart-store'
import {
  addCartItem, applyQuotedPrices, removeOrderedLines, sameLine, setCartQuantity, type CartItem, type OrderedLine,
} from '@/lib/cart'

export type { CartItem } from '@/lib/cart'

type CartContext = {
  items: CartItem[]
  add: (item: CartItem) => { error?: string }
  setQty: (slug: string, size: string, qty: number) => void
  remove: (slug: string, size: string) => void
  clear: () => void
  /** Adopta los precios cotizados por el servidor. */
  syncPrices: (lines: { slug: string; size: string; unit_price_cents: number }[]) => void
  /** Quita lo pedido tal cual; devuelve las líneas pedidas que cambiaron mientras tanto. */
  consumeOrder: (lines: OrderedLine[]) => CartItem[]
  count: number
  total: number
  warning?: string
}

const Ctx = createContext<CartContext | null>(null)
const KEY = 'clothes-shop-cart'

// El acceso a localStorage es diferido: el módulo también se carga al renderizar en servidor.
const store = createCartStore({
  read: () => localStorage.getItem(KEY),
  write: (raw) => localStorage.setItem(KEY, raw),
})
const { getSnapshot, getServerSnapshot, save: guardar } = store

function subscribe(listener: () => void) {
  const unsubscribe = store.subscribe(listener)
  // Los cambios de otras pestañas se leen al recibir este evento del navegador.
  window.addEventListener('storage', listener)
  return () => {
    unsubscribe()
    window.removeEventListener('storage', listener)
  }
}
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { items, warning } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Lee del store y no de `items` del render: dos llamadas seguidas (añadir dos tallas
  // sin soltar) verían la misma instantánea vieja y la segunda pisaría a la primera.
  const update = (fn: (prev: CartItem[]) => CartItem[]) => guardar(fn(getSnapshot().items))

  const add = (item: CartItem) => {
    const result = addCartItem(getSnapshot().items, item)
    if (!result.error) guardar(result.items)
    return { error: result.error }
  }

  const setQty = (slug: string, size: string, qty: number) =>
    update((prev) => setCartQuantity(prev, slug, size, qty))

  const remove = (slug: string, size: string) =>
    update((prev) => prev.filter((i) => !sameLine(i, slug, size)))

  const value: CartContext = {
    items,
    warning,
    add,
    setQty,
    remove,
    clear: () => update(() => []),
    syncPrices: (lines) => {
      const prev = getSnapshot().items
      const next = applyQuotedPrices(prev, lines)
      if (next !== prev) guardar(next)
    },
    consumeOrder: (lines) => {
      const { items: rest, changed } = removeOrderedLines(getSnapshot().items, lines)
      guardar(rest)
      return changed
    },
    count: items.reduce((n, i) => n + i.qty, 0),
    total: items.reduce((n, i) => n + i.qty * i.price_cents, 0),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
