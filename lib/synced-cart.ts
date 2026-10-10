import { readSavedCart, type CartItem, type OrderedLine } from './cart.ts'
import { applyCartOperation, cartLines, parseOperation, presentCart, type CartOperation } from './account-cart.ts'

export const GUEST_CART_KEY = 'clothes-shop-cart'
export const ACCOUNT_CACHE_PREFIX = 'clothes-shop-account-cart:'
export const ACCOUNT_OP_PREFIX = 'clothes-shop-cart-op:'
export type CartSnapshot = { items: CartItem[]; owner: string | null; loading: boolean; sync: 'local' | 'syncing' | 'saved' | 'error'; warning?: string }
export type CartStorage = {
  read: (key: string) => string | null
  write: (key: string, value: string) => void
  remove: (key: string) => void
  entries: (prefix: string) => [string, string][]
}
type Dependencies = {
  storage: CartStorage
  readRemote: (owner: string) => Promise<CartItem[]>
  mutateRemote: (owner: string, op: CartOperation) => Promise<CartItem[]>
}

/** Diario por operación y cuenta: evita que dos pestañas sobrescriban sus pendientes. */
export function createSyncedCart({ storage, readRemote, mutateRemote }: Dependencies) {
  const empty: CartSnapshot = { items: [], owner: null, loading: true, sync: 'local' }
  let snapshot = empty
  let generation = 0
  let base: CartItem[] = []
  let catalog: CartItem[] = []
  let guestMemory: CartItem[] | null = null
  let lastCreatedAt = 0
  let mergeWarning: string | undefined
  const memoryOps = new Map<string, CartOperation>()
  const acknowledged = new Set<string>()
  const flights = new Map<number, Promise<void>>()
  const listeners = new Set<() => void>()

  function publish(next: CartSnapshot) {
    snapshot = next
    listeners.forEach((listener) => listener())
  }
  function addDetails(items: CartItem[]) {
    catalog = [...new Map([...catalog, ...items].map((item) => [item.slug, item])).values()].slice(-100)
  }
  const journalKey = (owner: string, id: string) => `${ACCOUNT_OP_PREFIX}${owner}:${id}`
  function operations(owner: string) {
    const all = new Map(memoryOps)
    try {
      for (const [key, raw] of storage.entries(`${ACCOUNT_OP_PREFIX}${owner}:`)) {
        const op = parseOperation(raw)
        if (op && key === journalKey(owner, op.id)) all.set(key, op)
      }
    } catch { /* Diario en memoria si el navegador bloquea almacenamiento. */ }
    return [...all.entries()].filter(([key]) => key.startsWith(`${ACCOUNT_OP_PREFIX}${owner}:`) && !acknowledged.has(key))
      .map(([, op]) => op).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  }
  function remember(owner: string) {
    try {
      const key = `${ACCOUNT_CACHE_PREFIX}${owner}`
      const raw = JSON.stringify({ items: base, catalog })
      if (storage.read(key) !== raw) storage.write(key, raw)
    }
    catch { /* La sincronización aún funciona; la caché no es el registro principal. */ }
  }
  function visible(owner: string, sync: CartSnapshot['sync'], warning?: string) {
    const pending = operations(owner)
    const lines = pending.reduce((items, op) => applyCartOperation(items, op), cartLines(base))
    publish({ items: presentCart(lines, catalog), owner, loading: false, sync, warning: warning ?? mergeWarning })
  }
  function readGuest() {
    if (guestMemory) return { items: guestMemory }
    try { return readSavedCart(storage.read(GUEST_CART_KEY)) }
    catch { return { items: [], warning: 'No pudimos leer el carrito guardado en este navegador.' } }
  }
  function saveGuest(items: CartItem[]) {
    guestMemory = items
    try { storage.write(GUEST_CART_KEY, JSON.stringify(items)); guestMemory = null; return undefined }
    catch { return 'No pudimos guardar el carrito en este navegador. Podés perderlo al recargar.' }
  }
  function enqueue(owner: string, kind: CartOperation['kind'], lines: OrderedLine[]) {
    lastCreatedAt = Math.max(Date.now(), lastCreatedAt + 1)
    const op: CartOperation = { id: crypto.randomUUID(), kind, lines: cartLines(lines), createdAt: lastCreatedAt }
    const key = journalKey(owner, op.id)
    memoryOps.set(key, op)
    try { storage.write(key, JSON.stringify(op)); return true }
    catch { return false }
  }

  async function flush(owner: string, version: number) {
    try {
      const remote = await readRemote(owner)
      if (version !== generation) return
      base = remote; addDetails(remote)
      visible(owner, 'syncing')
      for (const op of operations(owner)) {
        const result = await mutateRemote(owner, op)
        if (version !== generation) return
        const key = journalKey(owner, op.id)
        acknowledged.add(key); memoryOps.delete(key)
        try { storage.remove(key) } catch { /* El reintento del servidor es idempotente. */ }
        base = result; addDetails(result)
        if (op.kind === 'merge') {
          const rest = readGuest().items.filter((item) => !result.some((line) => line.slug === item.slug && line.size === item.size && line.qty >= item.qty))
          saveGuest(rest)
          if (rest.length) mergeWarning = 'El carrito de tu cuenta alcanzó su límite. Conservamos las prendas restantes en el carrito de visitante.'
        }
        remember(owner)
        visible(owner, 'syncing')
      }
      remember(owner)
      visible(owner, operations(owner).length ? 'syncing' : 'saved')
    } catch {
      if (version === generation) visible(owner, 'error', 'No pudimos sincronizar tu carrito. Conservamos los cambios aquí y reintentaremos al recuperar la conexión.')
    }
  }
  function refresh(): Promise<void> {
    const owner = snapshot.owner
    if (!owner) {
      const guest = readGuest()
      publish({ ...guest, owner: null, loading: false, sync: 'local' })
      return Promise.resolve()
    }
    if (flights.has(generation)) return flights.get(generation)!
    const version = generation
    visible(owner, 'syncing')
    const flight = flush(owner, version).finally(() => {
      flights.delete(version)
      // Se pudo añadir una operación mientras la anterior estaba en vuelo.
      if (version === generation && snapshot.sync !== 'error' && operations(owner).length) void refresh()
    })
    flights.set(version, flight)
    return flight
  }
  async function setOwner(owner: string | null) {
    if (!snapshot.loading && owner === snapshot.owner) return refresh()
    generation++
    base = []; catalog = []
    mergeWarning = undefined
    if (!owner) {
      const guest = readGuest()
      publish({ ...guest, owner: null, loading: false, sync: 'local' })
      return
    }
    try {
      const cache = JSON.parse(storage.read(`${ACCOUNT_CACHE_PREFIX}${owner}`) ?? '{}')
      base = readSavedCart(JSON.stringify(cache.items ?? [])).items
      catalog = readSavedCart(JSON.stringify(cache.catalog ?? [])).items
    } catch { /* Primera entrada o caché corrupta: recuperar desde servidor. */ }
    const guest = readGuest()
    if (guest.items.length) {
      addDetails(guest.items)
      enqueue(owner, 'merge', guest.items)
    }
    visible(owner, 'syncing')
    await refresh()
  }
  function change(kind: CartOperation['kind'], lines: OrderedLine[], details: CartItem[] = []) {
    addDetails(details)
    if (!snapshot.owner) {
      const items = presentCart(applyCartOperation(snapshot.items, { id: '', kind, lines, createdAt: 0 }), [...snapshot.items, ...details])
      const warning = saveGuest(items)
      publish({ items, owner: null, loading: false, sync: 'local', warning })
      return
    }
    const owner = snapshot.owner
    const durable = enqueue(owner, kind, lines)
    remember(owner)
    visible(owner, 'syncing', durable ? undefined : 'El navegador bloqueó el guardado local. Conservamos tus cambios en memoria mientras se sincronizan.')
    void refresh()
  }
  function setPrices(items: CartItem[]) {
    if (!snapshot.owner) { const warning = saveGuest(items); publish({ ...snapshot, items, warning }); return }
    catalog = items
    publish({ ...snapshot, items })
  }
  return {
    getSnapshot: () => snapshot, getServerSnapshot: () => empty,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    setOwner, change, refresh, setPrices,
  }
}
