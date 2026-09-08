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

/**
 * Hay que distinguir «no hay nada guardado» (null) de «no hay almacenamiento»
 * (bloqueado, modo privado, cuota). Si los mezclamos, un navegador sin storage
 * parecería tener siempre el carrito vacío y no se podría ni comprar en memoria.
 */
const SIN_ALMACENAMIENTO = Symbol('sin almacenamiento')

// React llama a getSnapshot en cada render y comprobación: sin este cerrojo, un
// navegador sin almacenamiento escupe el mismo error cientos de veces por sesión y
// entierra en la consola cualquier otra cosa que hubiera que ver.
let yaAvisado = false

function leerCrudo(): string | null | typeof SIN_ALMACENAMIENTO {
  try {
    return localStorage.getItem(KEY)
  } catch (error) {
    if (!yaAvisado) {
      yaAvisado = true
      console.error('Sin acceso al almacenamiento; el carrito vivirá sólo en memoria:', error)
    }
    return SIN_ALMACENAMIENTO
  }
}

function getSnapshot(): CartItem[] {
  const raw = leerCrudo()

  // Sin almacenamiento, la caché en memoria ES el carrito: se pierde al recargar,
  // pero durante la sesión se puede añadir, cambiar cantidades y pagar.
  if (raw === SIN_ALMACENAMIENTO) return cache.items

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
  const raw = JSON.stringify(items)

  // La caché se actualiza SIEMPRE y antes de intentar persistir. Si se dejara para
  // después del setItem, un almacenamiento bloqueado dejaría el store sin cambiar y
  // la interfaz no reaccionaría a añadir, quitar ni cambiar cantidades.
  cache = { raw, items }

  try {
    localStorage.setItem(KEY, raw)
  } catch (error) {
    console.error('No se pudo guardar el carrito; sigue sólo en memoria:', error)
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
