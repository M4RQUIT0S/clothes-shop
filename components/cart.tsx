'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type CartItem = {
  slug: string
  name: string
  size: string
  price_cents: number
  image_url: string
  color: string
  qty: number
}

type CartContext = {
  items: CartItem[]
  add: (item: CartItem) => void
  setQty: (slug: string, size: string, qty: number) => void
  remove: (slug: string, size: string) => void
  clear: () => void
  count: number
  total: number
}

const Ctx = createContext<CartContext | null>(null)
const KEY = 'clothes-shop-cart'

const sameLine = (a: CartItem, slug: string, size: string) =>
  a.slug === slug && a.size === size

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch (error) {
      console.error('No se pudo leer el carrito guardado:', error)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items))
  }, [items, loaded])

  const add = (item: CartItem) =>
    setItems((prev) =>
      prev.some((i) => sameLine(i, item.slug, item.size))
        ? prev.map((i) =>
            sameLine(i, item.slug, item.size) ? { ...i, qty: i.qty + item.qty } : i
          )
        : [...prev, item]
    )

  const setQty = (slug: string, size: string, qty: number) =>
    setItems((prev) =>
      qty < 1
        ? prev.filter((i) => !sameLine(i, slug, size))
        : prev.map((i) => (sameLine(i, slug, size) ? { ...i, qty } : i))
    )

  const remove = (slug: string, size: string) =>
    setItems((prev) => prev.filter((i) => !sameLine(i, slug, size)))

  const value: CartContext = {
    items,
    add,
    setQty,
    remove,
    clear: () => setItems([]),
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
