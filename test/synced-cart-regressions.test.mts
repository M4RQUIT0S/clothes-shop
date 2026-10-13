import assert from 'node:assert/strict'
import test from 'node:test'
import { applyCartOperation, CartOperationRejected, cartLines, presentCart, type CartOperation } from '../lib/account-cart.ts'
import { MAX_CART_LINES, type CartItem, type OrderedLine } from '../lib/cart.ts'
import { ACCOUNT_OP_PREFIX, createSyncedCart, GUEST_CART_KEY, type CartStorage } from '../lib/synced-cart.ts'
import { migratedDb } from './support/db.mts'

const item: CartItem = { slug: 'remera', size: 'M', qty: 2, name: 'Remera', price_cents: 100, image_url: '', color: '#333' }
const other: CartItem = { ...item, slug: 'jean', name: 'Jean', qty: 1 }

function sharedStorage() {
  const values = new Map<string, string>()
  let readBlocked = false
  let writeBlocked = false
  const storage: CartStorage = {
    read(key) { if (readBlocked) throw Error('storage unavailable'); return values.get(key) ?? null },
    write(key, value) { if (writeBlocked) throw Error('storage full'); values.set(key, value) },
    remove(key) { values.delete(key) },
    entries(prefix) { return [...values.entries()].filter(([key]) => key.startsWith(prefix)) },
  }
  return {
    storage, values,
    blockReads(value: boolean) { readBlocked = value },
    blockWrites(value: boolean) { writeBlocked = value },
  }
}

function accountServer() {
  const local = sharedStorage()
  let remote: CartItem[] = []
  let readBlocked = false
  let failures: ('before' | 'after' | 'enrich' | null)[] = []
  const receipts = new Set<string>()
  const dependencies = {
    storage: local.storage,
    readRemote: async () => {
      if (readBlocked) throw Error('offline')
      return remote
    },
    mutateRemote: async (_owner: string, op: CartOperation) => {
      const [failure, ...remaining] = failures
      failures = remaining
      if (failure === 'before') throw Error('request unavailable')
      if (!receipts.has(op.id)) {
        remote = presentCart(applyCartOperation(remote, op), [item, other])
        receipts.add(op.id)
      }
      if (failure === 'after') throw Error('response lost after commit')
      if (failure === 'enrich') throw Object.assign(Error('product enrichment failed after commit'), { code: '22023' })
      // The real RPC returns the current cart even for a previously applied UUID.
      return remote
    },
  }
  return {
    createStore: () => createSyncedCart(dependencies),
    remote: () => remote,
    pending: () => local.storage.entries(ACCOUNT_OP_PREFIX),
    blockReads(value: boolean) { readBlocked = value },
    failMutations(...next: typeof failures) { failures = next },
  }
}

function recordQuantities(store: ReturnType<typeof createSyncedCart>, slug = item.slug) {
  let quantities: number[] = []
  const unsubscribe = store.subscribe(() => {
    quantities = [...quantities, store.getSnapshot().items.find((line) => line.slug === slug)?.qty ?? 0]
  })
  return { quantities: () => quantities, unsubscribe }
}

test('una lectura exitosa tras perder la respuesta no duplica unidades si el reintento falla', async () => {
  const server = accountServer()
  const store = server.createStore()
  await store.setOwner('a')
  const observed = recordQuantities(store)
  server.failMutations('after', 'before')
  store.change('add', [item], [item])
  await store.refresh()
  assert.equal(server.remote()[0].qty, 2)
  await store.refresh()
  observed.unsubscribe()
  assert.equal(store.getSnapshot().sync, 'error')
  assert.equal(store.getSnapshot().items[0].qty, 2)
  assert.ok(observed.quantities().every((qty) => qty <= 2), `cantidades publicadas: ${observed.quantities()}`)
  await store.refresh()
  assert.equal(store.getSnapshot().sync, 'saved')
  assert.equal(server.remote()[0].qty, 2)
})

test('recargar conserva una segunda operación de resultado incierto sin repetirla sobre el estado remoto', async () => {
  const server = accountServer()
  const store = server.createStore()
  await store.setOwner('a')
  server.blockReads(true)
  store.change('add', [{ ...item, qty: 1 }], [item])
  store.change('add', [item], [item])
  await store.refresh()
  const observed = recordQuantities(store)
  server.blockReads(false)
  server.failMutations(null, 'after', 'before', 'before')
  await store.refresh()
  assert.equal(server.remote()[0].qty, 3)
  await store.refresh()
  const reloaded = server.createStore()
  const afterReload = recordQuantities(reloaded)
  await reloaded.setOwner('a')
  observed.unsubscribe()
  afterReload.unsubscribe()
  assert.equal(store.getSnapshot().items[0].qty, 3)
  assert.equal(reloaded.getSnapshot().items[0].qty, 3)
  const quantities = [...observed.quantities(), ...afterReload.quantities()]
  assert.ok(quantities.every((qty) => qty <= 3), `cantidades publicadas: ${quantities}`)
  await reloaded.refresh()
  assert.equal(reloaded.getSnapshot().sync, 'saved')
  assert.equal(server.remote()[0].qty, 3)
})

test('un error de productos 22023 después del commit conserva la operación para su reintento', async () => {
  const server = accountServer()
  const store = server.createStore()
  await store.setOwner('a')
  server.failMutations('enrich')
  store.change('add', [item], [item])
  await store.refresh()
  assert.equal(server.remote()[0].qty, 2)
  assert.equal(store.getSnapshot().items[0].qty, 2)
  assert.equal(store.getSnapshot().sync, 'error')
  assert.equal(server.pending().length, 1)
  await store.refresh()
  assert.equal(store.getSnapshot().items[0].qty, 2)
  assert.equal(store.getSnapshot().sync, 'saved')
  assert.equal(server.pending().length, 0)
  assert.equal(server.remote()[0].qty, 2)
})

test('un rechazo SQL de capacidad no bloquea remove ni se reintenta indefinidamente', async (t) => {
  const db = await migratedDb()
  t.after(() => db.close())
  const owner = '10000000-0000-4000-8000-000000000003'
  await db.query('insert into auth.users values ($1)', [owner])
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner])
  await db.exec('set role authenticated')
  const local = sharedStorage()
  const full = Array.from({ length: MAX_CART_LINES }, (_, index) => ({ ...item, slug: `prenda${index}`, qty: 1 }))
  let rejectedCodes: string[] = []
  const mutate = async (op: Pick<CartOperation, 'id' | 'kind' | 'lines'>) => {
    const result = await db.query<{ items: OrderedLine[] }>(
      'select public.mutate_account_cart($1, $2, $3) as items', [op.id, op.kind, JSON.stringify(op.lines)],
    )
    return presentCart(result.rows[0].items, [...full, other])
  }
  const readRemote = async () => {
    const result = await db.query<{ items: OrderedLine[] }>('select items from public.account_carts')
    return presentCart(result.rows[0]?.items ?? [], [...full, other])
  }
  await mutate({ id: crypto.randomUUID(), kind: 'merge', lines: cartLines(full.slice(0, -1)) })
  const store = createSyncedCart({
    storage: local.storage, readRemote,
    mutateRemote: async (_owner, op) => {
      try { return await mutate(op) }
      catch (error) {
        const code = (error as { code: string }).code
        rejectedCodes = [...rejectedCodes, code]
        if (code === '22023') throw new CartOperationRejected()
        throw error
      }
    },
  })
  await store.setOwner(owner)
  // Another device fills the final slot before this store receives an update.
  await mutate({ id: crypto.randomUUID(), kind: 'add', lines: cartLines(full.slice(-1)) })
  store.change('add', [other], [other])
  store.change('remove', [{ ...full[0], qty: 0 }])
  await store.refresh()
  await store.refresh()
  const remote = await readRemote()
  assert.equal(remote.length, MAX_CART_LINES - 1)
  assert.ok(!remote.some((line) => line.slug === full[0].slug || line.slug === other.slug))
  assert.deepEqual(rejectedCodes, ['22023'])
  assert.equal(local.storage.entries(`${ACCOUNT_OP_PREFIX}${owner}:`).length, 0)
  assert.equal(store.getSnapshot().sync, 'saved')
})

test('dos pestañas visitantes conservan las prendas aunque aún no llegue el evento storage', async () => {
  const local = sharedStorage()
  const dependencies = { storage: local.storage, readRemote: async () => [], mutateRemote: async () => [] }
  const first = createSyncedCart(dependencies)
  const second = createSyncedCart(dependencies)
  await first.setOwner(null)
  await second.setOwner(null)
  first.change('add', [item], [item])
  second.change('add', [other], [other])
  assert.deepEqual(second.getSnapshot().items, [item, other])
  assert.deepEqual(JSON.parse(local.values.get(GUEST_CART_KEY)!), [item, other])
  await first.refresh()
  assert.deepEqual(first.getSnapshot().items, [item, other])
})

test('una cotización visitante actualiza precios sin borrar cambios de otra pestaña', async () => {
  const local = sharedStorage()
  const dependencies = { storage: local.storage, readRemote: async () => [], mutateRemote: async () => [] }
  const first = createSyncedCart(dependencies)
  const second = createSyncedCart(dependencies)
  await first.setOwner(null)
  first.change('add', [item], [item])
  await second.setOwner(null)
  second.change('add', [other], [other])
  first.setPrices([{ ...item, price_cents: 200 }])
  const expected = [{ ...item, price_cents: 200 }, other]
  assert.deepEqual(first.getSnapshot().items, expected)
  assert.deepEqual(JSON.parse(local.values.get(GUEST_CART_KEY)!), expected)
})

test('el visitante conserva sus cambios en memoria si fallan lectura y escritura de storage', async () => {
  const local = sharedStorage()
  const store = createSyncedCart({ storage: local.storage, readRemote: async () => [], mutateRemote: async () => [] })
  await store.setOwner(null)
  store.change('add', [item], [item])
  local.blockReads(true)
  local.blockWrites(true)
  store.change('add', [other], [other])
  assert.deepEqual(store.getSnapshot().items, [item, other])
  assert.ok(store.getSnapshot().warning)
  await store.refresh()
  store.change('set', [{ ...item, qty: 3 }])
  assert.deepEqual(store.getSnapshot().items, [{ ...item, qty: 3 }, other])
  local.blockReads(false)
  local.blockWrites(false)
  store.change('remove', [{ ...other, qty: 0 }])
  assert.deepEqual(JSON.parse(local.values.get(GUEST_CART_KEY)!), [{ ...item, qty: 3 }])
})
