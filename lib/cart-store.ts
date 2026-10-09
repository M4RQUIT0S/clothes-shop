import { readSavedCart, type CartItem } from './cart.ts'

type StorageAccess = {
  read: () => string | null
  write: (raw: string) => void
}

const MEMORY_WARNING = 'No pudimos guardar el carrito en este navegador. Se conserva durante esta sesión, pero puede perderse al recargar.'

export function createCartStore(storage: StorageAccess) {
  const empty: ReturnType<typeof readSavedCart> = { items: [] }
  let snapshot = empty
  let persisted: string | null = null
  let memoryOnly = false
  const listeners = new Set<() => void>()

  const getSnapshot = () => {
    if (memoryOnly) return snapshot
    try {
      const raw = storage.read()
      if (raw !== persisted) {
        persisted = raw
        snapshot = readSavedCart(raw)
      }
    } catch {
      memoryOnly = true
      snapshot = { ...snapshot, warning: MEMORY_WARNING }
    }
    return snapshot
  }

  const save = (items: CartItem[]) => {
    const raw = JSON.stringify(items)
    snapshot = { items }
    try {
      storage.write(raw)
      persisted = raw
      memoryOnly = false
    } catch {
      // No volver a leer la copia antigua mientras los cambios sólo estén en memoria.
      memoryOnly = true
      snapshot = { items, warning: MEMORY_WARNING }
    }
    listeners.forEach((notify) => notify())
  }

  return {
    getSnapshot,
    getServerSnapshot: () => empty,
    save,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}
