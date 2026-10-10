'use client'

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'
import { createSyncedCart, type CartSnapshot } from '@/lib/synced-cart'
import { mutateAccountCart, readAccountCart } from '@/lib/account-cart-api'
import { useAuth } from './auth'
import {
  addCartItem, applyQuotedPrices, MAX_ITEM_QUANTITY, removeOrderedLines, type CartItem, type OrderedLine,
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
  sync: CartSnapshot['sync']
  ready: boolean
  retrySync: () => Promise<void>
  ownerId: string | null
}

const Ctx = createContext<CartContext | null>(null)
const store = createSyncedCart({
  storage: {
    read: (key) => localStorage.getItem(key), write: (key, raw) => localStorage.setItem(key, raw),
    remove: (key) => localStorage.removeItem(key),
    entries: (prefix) => Object.keys(localStorage).filter((key) => key.startsWith(prefix)).map((key) => [key, localStorage.getItem(key)!]),
  },
  readRemote: readAccountCart, mutateRemote: mutateAccountCart,
})
export function CartProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  const owner = auth.user?.id ?? null
  const correctOwner = auth.ready && snapshot.owner === owner
  const items = correctOwner ? snapshot.items : []
  const { warning, sync, loading } = snapshot
  useEffect(() => { if (auth.ready) void store.setOwner(owner) }, [owner, auth.ready])
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void store.refresh() }
    window.addEventListener('storage', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(() => { if (store.getSnapshot().owner) refresh() }, 15_000)
    return () => {
      window.removeEventListener('storage', refresh); window.removeEventListener('online', refresh)
      window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh)
      clearInterval(timer)
    }
  }, [])

  const canChange = () => auth.ready && store.getSnapshot().owner === owner && !store.getSnapshot().loading
  const add = (item: CartItem) => {
    if (!canChange()) return { error: 'Estamos recuperando tu carrito. Probá en un momento.' }
    const result = addCartItem(store.getSnapshot().items, item)
    if (!result.error) store.change('add', [item], [item])
    return { error: result.error }
  }

  const value: CartContext = {
    items,
    warning,
    add,
    setQty: (slug, size, qty) => { if (canChange() && Number.isInteger(qty) && qty >= 1 && qty <= MAX_ITEM_QUANTITY) store.change('set', [{ slug, size, qty }]) },
    remove: (slug, size) => { if (canChange()) store.change('remove', [{ slug, size, qty: 0 }]) },
    clear: () => { if (canChange()) store.change('clear', []) },
    sync, ready: correctOwner && !loading, retrySync: store.refresh, ownerId: owner,
    syncPrices: (lines) => {
      if (!canChange()) return
      const prev = store.getSnapshot().items
      const next = applyQuotedPrices(prev, lines)
      if (next !== prev) store.setPrices(next)
    },
    consumeOrder: (lines) => {
      if (!canChange()) return []
      const { changed } = removeOrderedLines(store.getSnapshot().items, lines)
      store.change('consume', lines)
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
