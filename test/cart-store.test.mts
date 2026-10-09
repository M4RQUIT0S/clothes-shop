import assert from 'node:assert/strict'
import test from 'node:test'
import { createCartStore } from '../lib/cart-store.ts'
import type { CartItem } from '../lib/cart.ts'

const item: CartItem = {
  slug: 'remera', name: 'Remera', size: 'M', qty: 1,
  price_cents: 10000, image_url: '/remera.jpg', color: '#fff',
}

test('una cuota agotada conserva cambios en memoria aunque leer storage siga funcionando', () => {
  const store = createCartStore({
    read: () => JSON.stringify([item]),
    write: () => { throw new Error('QuotaExceededError') },
  })
  assert.equal(store.getSnapshot().items[0].qty, 1)
  store.save([{ ...item, qty: 2 }])
  const next = store.getSnapshot()
  assert.equal(next.items[0].qty, 2)
  assert.ok(next.warning)
  assert.equal(store.getSnapshot(), next)
})

test('almacenamiento bloqueado permite agregar y quitar durante la sesión', () => {
  const store = createCartStore({
    read: () => { throw new Error('SecurityError') },
    write: () => { throw new Error('SecurityError') },
  })
  store.save([item])
  assert.deepEqual(store.getSnapshot().items, [item])
  store.save([])
  assert.deepEqual(store.getSnapshot().items, [])
})

test('notifica cambios locales y recupera una actualización persistida de otra pestaña', () => {
  let raw: string | null = null
  const store = createCartStore({ read: () => raw, write: (value) => { raw = value } })
  let notifications = 0
  const unsubscribe = store.subscribe(() => { notifications++ })
  assert.equal(store.getSnapshot(), store.getServerSnapshot())
  store.save([item])
  assert.equal(notifications, 1)
  const snapshot = store.getSnapshot()
  assert.equal(store.getSnapshot(), snapshot)
  raw = JSON.stringify([{ ...item, qty: 3 }])
  assert.equal(store.getSnapshot().items[0].qty, 3)
  unsubscribe()
  store.save([])
  assert.equal(notifications, 1)
})
