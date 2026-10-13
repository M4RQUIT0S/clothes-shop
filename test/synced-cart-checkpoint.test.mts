import assert from 'node:assert/strict'
import test from 'node:test'
import { applyCartOperation, presentCart, type CartOperation } from '../lib/account-cart.ts'
import type { CartItem } from '../lib/cart.ts'
import { ACCOUNT_CACHE_PREFIX, ACCOUNT_OP_PREFIX, createSyncedCart, type CartStorage } from '../lib/synced-cart.ts'

const item: CartItem = { slug: 'remera', size: 'M', qty: 2, name: 'Remera', price_cents: 100, image_url: '', color: '#333' }

function sharedServer() {
  const values = new Map<string, string>()
  const receipts = new Set<string>()
  let remote: CartItem[] = []
  let removeBlocked = false
  let cacheBlocked = false
  let writesBlocked = false
  const storage: CartStorage = {
    read: (key) => values.get(key) ?? null,
    write(key, value) {
      if (writesBlocked) throw Error('storage full')
      if (cacheBlocked && key.startsWith(ACCOUNT_CACHE_PREFIX)) throw Error('cache unavailable')
      values.set(key, value)
    },
    remove(key) { if (removeBlocked) throw Error('remove unavailable'); values.delete(key) },
    entries: (prefix) => [...values].filter(([key]) => key.startsWith(prefix)),
  }
  function tab() {
    let offline = false
    let nextRead: ((items: CartItem[]) => Promise<CartItem[]>) | undefined
    const store = createSyncedCart({
      storage,
      readRemote: async () => {
        if (offline) throw Error('offline')
        const wait = nextRead
        nextRead = undefined
        return wait ? wait(remote) : remote
      },
      mutateRemote: async (_owner: string, op: CartOperation) => {
        if (offline) throw Error('offline')
        if (!receipts.has(op.id)) {
          remote = presentCart(applyCartOperation(remote, op), [item])
          receipts.add(op.id)
        }
        return remote
      },
    })
    return {
      store, setOffline(value: boolean) { offline = value },
      holdNextRead() {
        let release!: () => void
        let onStart!: () => void
        const started = new Promise<void>((resolve) => { onStart = resolve })
        const barrier = new Promise<void>((resolve) => { release = resolve })
        nextRead = async (items) => { onStart(); await barrier; return items }
        return { started, release }
      },
    }
  }
  return {
    tab, remote: () => remote,
    pending: () => storage.entries(ACCOUNT_OP_PREFIX),
    blockRemove(value: boolean) { removeBlocked = value },
    blockCache(value: boolean) { cacheBlocked = value },
    blockWrites(value: boolean) { writesBlocked = value },
  }
}

test('un checkpoint posterior recuerda operaciones confirmadas que storage no pudo eliminar', async () => {
  const server = sharedServer()
  const first = server.tab()
  await first.store.setOwner('a')
  server.blockRemove(true)
  first.store.change('add', [item], [item])
  await first.store.refresh()
  assert.equal(first.store.getSnapshot().items[0].qty, 2)
  assert.equal(server.pending().length, 1)
  await first.store.refresh()
  const reloaded = server.tab()
  reloaded.setOffline(true)
  await reloaded.store.setOwner('a')
  assert.equal(reloaded.store.getSnapshot().items[0].qty, 2)
})

test('una pestaña offline conserva el efecto confirmado por otra antes de agregar más unidades', async () => {
  const server = sharedServer()
  const first = server.tab()
  await first.store.setOwner('a')
  first.setOffline(true)
  first.store.change('add', [item], [item])
  await first.store.refresh()
  const second = server.tab()
  await second.store.setOwner('a')
  assert.equal(server.remote()[0].qty, 2)
  assert.equal(server.pending().length, 0)
  first.store.change('add', [{ ...item, qty: 1 }], [item])
  await first.store.refresh()
  assert.equal(first.store.getSnapshot().items[0].qty, 3)
  const reloaded = server.tab()
  reloaded.setOffline(true)
  await reloaded.store.setOwner('a')
  assert.equal(reloaded.store.getSnapshot().items[0].qty, 3)
})

test('un checkpoint que no se pudo guardar conserva el diario para recarga offline', async () => {
  const server = sharedServer()
  const first = server.tab()
  await first.store.setOwner('a')
  server.blockCache(true)
  first.store.change('add', [item], [item])
  await first.store.refresh()
  assert.equal(server.remote()[0].qty, 2)
  assert.equal(server.pending().length, 1)
  const reloaded = server.tab()
  reloaded.setOffline(true)
  await reloaded.store.setOwner('a')
  assert.equal(reloaded.store.getSnapshot().items[0].qty, 2)
  server.blockCache(false)
  reloaded.setOffline(false)
  await reloaded.store.refresh()
  assert.equal(reloaded.store.getSnapshot().items[0].qty, 2)
  assert.equal(server.remote()[0].qty, 2)
  assert.equal(server.pending().length, 0)
})

test('una operación agregada mientras se lee el servidor también queda confirmada', async () => {
  const server = sharedServer()
  const first = server.tab()
  await first.store.setOwner('a')
  const gate = first.holdNextRead()
  const flight = first.store.refresh()
  await gate.started
  first.store.change('add', [item], [item])
  gate.release()
  await flight
  assert.equal(server.remote()[0].qty, 2)
  assert.equal(first.store.getSnapshot().items[0].qty, 2)
  assert.equal(first.store.getSnapshot().sync, 'saved')
  assert.equal(server.pending().length, 0)
})

test('una lectura vieja no pisa el checkpoint confirmado por otra pestaña durante el vuelo', async () => {
  const server = sharedServer()
  const first = server.tab()
  await first.store.setOwner('a')
  const gate = first.holdNextRead()
  const flight = first.store.refresh()
  await gate.started
  const second = server.tab()
  await second.store.setOwner('a')
  second.store.change('add', [item], [item])
  await second.store.refresh()
  assert.equal(server.remote()[0].qty, 2)
  gate.release()
  await flight
  assert.equal(first.store.getSnapshot().items[0]?.qty, 2)
  const reloaded = server.tab()
  reloaded.setOffline(true)
  await reloaded.store.setOwner('a')
  assert.equal(reloaded.store.getSnapshot().items[0]?.qty, 2)
})

test('una operación confirmada sólo en memoria no se duplica cuando toda escritura falla', async () => {
  const server = sharedServer()
  const first = server.tab()
  await first.store.setOwner('a')
  server.blockWrites(true)
  first.store.change('add', [item], [item])
  await first.store.refresh()
  assert.equal(server.remote()[0].qty, 2)
  assert.equal(first.store.getSnapshot().items[0].qty, 2)
  assert.equal(first.store.getSnapshot().sync, 'error')
  await first.store.refresh()
  assert.equal(first.store.getSnapshot().items[0].qty, 2)
  server.blockWrites(false)
  await first.store.refresh()
  assert.equal(first.store.getSnapshot().items[0].qty, 2)
  assert.equal(server.remote()[0].qty, 2)
  assert.equal(first.store.getSnapshot().sync, 'saved')
})
