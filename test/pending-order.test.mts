import assert from 'node:assert/strict'
import test from 'node:test'
import { parsePendingOrder, serializePendingOrder } from '../lib/pending-order.ts'

const pending = {
  orderId: '6f1c2e0a-1b2c-4d5e-8f90-123456789abc',
  receiptPath: '/pedido/6f1c2e0a-1b2c-4d5e-8f90-123456789abc?t=abc_DEF-123',
  lines: [{ slug: 'remera', size: 'M', qty: 2 }],
}

test('guarda y recupera el pedido en curso sin datos personales', () => {
  const raw = serializePendingOrder(pending)
  assert.deepEqual(parsePendingOrder(raw), pending)
  assert.ok(!/@|full_name|address|email/.test(raw))
})

test('lo guardado corrupto, ajeno o manipulado se descarta en vez de romper', () => {
  for (const raw of [null, '', '{', '[]', '{"orderId":1}', JSON.stringify({ ...pending, orderId: 'x' }),
    JSON.stringify({ ...pending, receiptPath: 'https://evil.example/pedido/x' }),
    JSON.stringify({ ...pending, receiptPath: '//evil.example/pedido' }),
    JSON.stringify({ ...pending, lines: [{ slug: 'remera', size: 'M', qty: 0 }] }),
    JSON.stringify({ ...pending, lines: 'x' })]) {
    assert.equal(parsePendingOrder(raw), null, String(raw))
  }
})

test('el pedido pendiente conserva la cuenta original para no consumir otro carrito', () => {
  const owned = { ...pending, ownerId: '10000000-0000-4000-8000-000000000001' }
  assert.deepEqual(parsePendingOrder(serializePendingOrder(owned)), owned)
  assert.equal(parsePendingOrder(JSON.stringify({ ...pending, ownerId: 'otra' })), null)
})
