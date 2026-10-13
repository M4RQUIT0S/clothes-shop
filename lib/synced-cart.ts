import { applyQuotedPrices, readSavedCart, type CartItem, type OrderedLine } from './cart.ts'
import { applyCartOperation, CartOperationRejected, cartLines, parseOperation, presentCart, type CartOperation } from './account-cart.ts'

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
  let operationWarning: string | undefined
  let includedOperationIds = new Set<string>()
  let lastCacheRaw: string | null = null
  let checkpointRevision = 0
  const memoryOps = new Map<string, CartOperation>()
  const durableOps = new Set<string>()
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
  function readCheckpoint(owner: string) {
    try {
      const raw = storage.read(`${ACCOUNT_CACHE_PREFIX}${owner}`)
      if (!raw || raw === lastCacheRaw) return
      const cache = JSON.parse(raw)
      const items = readSavedCart(JSON.stringify(cache.items ?? [])).items
      const details = readSavedCart(JSON.stringify(cache.catalog ?? [])).items
      const included = new Set<string>(Array.isArray(cache.includedOperationIds)
        ? cache.includedOperationIds.filter((id: unknown): id is string => typeof id === 'string') : [])
      base = items; addDetails(details); includedOperationIds = included
      lastCacheRaw = raw
      checkpointRevision++
    } catch { /* Conservar la copia en memoria si la caché no está disponible. */ }
  }
  function operations(owner: string) {
    readCheckpoint(owner)
    const all = new Map(memoryOps)
    try {
      const prefix = `${ACCOUNT_OP_PREFIX}${owner}:`
      const entries = storage.entries(prefix)
      const storedKeys = new Set(entries.map(([key]) => key))
      for (const id of includedOperationIds) {
        const key = journalKey(owner, id)
        if (!storedKeys.has(key) && !memoryOps.has(key)) includedOperationIds.delete(id)
      }
      // Otra pestaña pudo confirmar y retirar una operación que originamos aquí.
      for (const key of durableOps) {
        if (key.startsWith(prefix) && !storedKeys.has(key)) {
          memoryOps.delete(key); durableOps.delete(key); all.delete(key)
        }
      }
      for (const [key, raw] of entries) {
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
      const raw = JSON.stringify({ items: base, catalog, includedOperationIds: [...includedOperationIds] })
      if (storage.read(key) !== raw) storage.write(key, raw)
      lastCacheRaw = raw
      return true
    }
    catch { return false }
  }
  function visible(owner: string, sync: CartSnapshot['sync'], warning?: string) {
    const pending = operations(owner)
    const lines = pending.filter((op) => !includedOperationIds.has(op.id))
      .reduce((items, op) => applyCartOperation(items, op), cartLines(base))
    publish({ items: presentCart(lines, catalog), owner, loading: false, sync, warning: warning ?? operationWarning ?? mergeWarning })
  }
  function readGuest() {
    if (guestMemory) return { items: guestMemory }
    try { return readSavedCart(storage.read(GUEST_CART_KEY)) }
    catch { return { items: snapshot.owner ? [] : snapshot.items, warning: 'No pudimos leer el carrito guardado en este navegador.' } }
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
    try { storage.write(key, JSON.stringify(op)); durableOps.add(key); return true }
    catch { return false }
  }

  function forget(owner: string, op: CartOperation) {
    const key = journalKey(owner, op.id)
    acknowledged.add(key); memoryOps.delete(key); durableOps.delete(key)
    try { storage.remove(key) } catch { /* La caché reconoce los UUID incluidos aunque quede el diario. */ }
  }
  function finishMerge(result: CartItem[]) {
    const rest = readGuest().items.filter((item) => !result.some((line) => line.slug === item.slug && line.size === item.size && line.qty >= item.qty))
    saveGuest(rest)
    if (rest.length) mergeWarning = 'El carrito de tu cuenta alcanzó su límite. Conservamos las prendas restantes en el carrito de visitante.'
  }
  async function flush(owner: string, version: number) {
    const completed = new Map<string, CartOperation>()
    try {
      while (version === generation) {
        for (const op of operations(owner).filter((op) => !completed.has(op.id))) {
          try {
            const result = await mutateRemote(owner, op)
            if (version !== generation) return
            completed.set(op.id, op)
            if (op.kind === 'merge') finishMerge(result)
          } catch (error) {
            if (version !== generation) return
            if (!(error instanceof CartOperationRejected)) throw error
            forget(owner, op)
            operationWarning = error.message
          }
        }
        const revision = checkpointRevision
        const remote = await readRemote(owner)
        if (version !== generation) return
        const pending = operations(owner)
        // Otra pestaña pudo confirmar cambios después de que empezó esta lectura.
        if (revision !== checkpointRevision || pending.some((op) => !completed.has(op.id))) continue
        // Ningún resultado intermedio se superpone al diario: puede contener operaciones
        // cuyo resultado se perdió o que otra pestaña ya aplicó. Se publica todo junto.
        base = remote; addDetails(remote)
        includedOperationIds = new Set([...includedOperationIds, ...completed.keys()])
        // El par base/UUID se guarda antes de limpiar; una recarga en medio no suma dos veces.
        if (!remember(owner)) {
          visible(owner, 'error', 'Tu carrito llegó al servidor, pero no pudimos guardar la copia local. Reintentaremos sin duplicar tus cambios.')
          return
        }
        completed.forEach((op) => forget(owner, op))
        visible(owner, 'saved')
        return
      }
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
    publish({ ...snapshot, sync: 'syncing' })
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
    operationWarning = undefined
    includedOperationIds = new Set()
    lastCacheRaw = null
    checkpointRevision = 0
    if (!owner) {
      const guest = readGuest()
      publish({ ...guest, owner: null, loading: false, sync: 'local' })
      return
    }
    readCheckpoint(owner)
    const guest = readGuest()
    if (guest.items.length) {
      addDetails(guest.items)
      enqueue(owner, 'merge', guest.items)
    }
    visible(owner, 'syncing')
    await refresh()
  }
  function change(kind: CartOperation['kind'], lines: OrderedLine[], details: CartItem[] = []) {
    if (!snapshot.owner) {
      const current = readGuest().items
      const items = presentCart(applyCartOperation(current, { id: '', kind, lines, createdAt: 0 }), [...current, ...details])
      const warning = saveGuest(items)
      publish({ items, owner: null, loading: false, sync: 'local', warning })
      return
    }
    const owner = snapshot.owner
    operations(owner)
    addDetails(details)
    const durable = enqueue(owner, kind, lines)
    remember(owner)
    visible(owner, 'syncing', durable ? undefined : 'El navegador bloqueó el guardado local. Conservamos tus cambios en memoria mientras se sincronizan.')
    void refresh()
  }
  function setPrices(items: CartItem[]) {
    if (!snapshot.owner) {
      const current = readGuest().items
      const updated = applyQuotedPrices(current, items.map((item) => ({ ...item, unit_price_cents: item.price_cents })))
      const warning = saveGuest(updated)
      publish({ ...snapshot, items: updated, warning })
      return
    }
    catalog = items
    publish({ ...snapshot, items })
  }
  return {
    getSnapshot: () => snapshot, getServerSnapshot: () => empty,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    setOwner, change, refresh, setPrices,
  }
}
