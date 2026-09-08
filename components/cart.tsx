'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'

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

/**
 * El carrito vive en localStorage y React lo lee con useSyncExternalStore.
 *
 * La versión anterior guardaba el carrito en un useState y lo rehidrataba llamando a
 * setState dentro de un efecto, que es justo lo que prohíbe react-hooks/set-state-in-effect:
 * provoca un render en cascada en cada montaje. No se podía arreglar con un inicializador
 * perezoso porque el servidor no tiene localStorage y el HTML no coincidiría con el del
 * cliente. useSyncExternalStore existe para este caso exacto: da una instantánea de
 * servidor (carrito vacío) para el HTML, y en cuanto hidrata cambia a la real sin aviso
 * de hidratación ni efecto de por medio.
 */

const VACIO: CartItem[] = []

/**
 * getSnapshot tiene que devolver la MISMA referencia mientras el contenido no cambie,
 * o React se queda renderizando en bucle. De ahí esta caché por texto crudo.
 */
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: VACIO }

const listeners = new Set<() => void>()

function leerCrudo() {
  try {
    return localStorage.getItem(KEY)
  } catch (error) {
    // Modo privado o almacenamiento bloqueado: la tienda sigue, sin persistencia.
    console.error('No se pudo leer el carrito guardado:', error)
    return null
  }
}

function getSnapshot(): CartItem[] {
  const raw = leerCrudo()
  if (raw !== cache.raw) {
    let items = VACIO
    try {
      if (raw) items = JSON.parse(raw)
    } catch (error) {
      console.error('El carrito guardado no es JSON válido; se descarta:', error)
    }
    cache = { raw, items }
  }
  return cache.items
}

const getServerSnapshot = () => VACIO

function subscribe(listener: () => void) {
  listeners.add(listener)
  // 'storage' sólo salta en las OTRAS pestañas; las de esta las avisa guardar().
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function guardar(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch (error) {
    console.error('No se pudo guardar el carrito:', error)
  }
  listeners.forEach((avisar) => avisar())
}

const sameLine = (a: CartItem, slug: string, size: string) => a.slug === slug && a.size === size

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Lee del store y no de `items` del render: dos llamadas seguidas (añadir dos tallas
  // sin soltar) verían la misma instantánea vieja y la segunda pisaría a la primera.
  const update = (fn: (prev: CartItem[]) => CartItem[]) => guardar(fn(getSnapshot()))

  const add = (item: CartItem) =>
    update((prev) =>
      prev.some((i) => sameLine(i, item.slug, item.size))
        ? prev.map((i) => (sameLine(i, item.slug, item.size) ? { ...i, qty: i.qty + item.qty } : i))
        : [...prev, item]
    )

  const setQty = (slug: string, size: string, qty: number) =>
    update((prev) =>
      qty < 1
        ? prev.filter((i) => !sameLine(i, slug, size))
        : prev.map((i) => (sameLine(i, slug, size) ? { ...i, qty } : i))
    )

  const remove = (slug: string, size: string) =>
    update((prev) => prev.filter((i) => !sameLine(i, slug, size)))

  const value: CartContext = {
    items,
    add,
    setQty,
    remove,
    clear: () => update(() => []),
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
