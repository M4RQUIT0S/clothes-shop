import assert from 'node:assert/strict'
import test from 'node:test'
import { applyCartOperation, type CartOperation } from '../lib/account-cart.ts'

const line = (slug: string, qty: number) => ({ slug, size: 'M', qty })
const op = (kind: CartOperation['kind'], lines = [line('remera', 2)]): CartOperation => ({ id: crypto.randomUUID(), kind, lines, createdAt: 1 })

test('fusionar conserva prendas distintas y la mayor cantidad sin duplicar al repetir', () => {
  const current = [line('remera', 3), line('jean', 1)]
  const operation = op('merge', [line('remera', 2), line('buzo', 1)])
  const expected = [...current, line('buzo', 1)]
  assert.deepEqual(applyCartOperation(current, operation), expected)
  assert.deepEqual(applyCartOperation(expected, operation), expected)
})

test('operaciones sobre una línea preservan cambios a otras prendas de otro dispositivo', () => {
  const current = [line('remera', 2), line('jean', 5)]
  assert.deepEqual(applyCartOperation(current, op('set', [line('remera', 4)])), [line('remera', 4), line('jean', 5)])
  assert.deepEqual(applyCartOperation(current, op('remove', [line('remera', 0)])), [line('jean', 5)])
})

test('consumir un pedido sólo elimina cantidades que siguen como las compradas', () => {
  assert.deepEqual(applyCartOperation([line('remera', 3), line('jean', 2)], op('consume', [line('remera', 2), line('jean', 2)])), [line('remera', 3)])
})

test('se respetan los límites del carrito y nunca se agregan cantidades negativas', () => {
  assert.deepEqual(applyCartOperation([line('remera', 20)], op('add')), [line('remera', 20)])
  assert.deepEqual(applyCartOperation([], op('set', [line('remera', -1)])), [])
  const full = Array.from({length: 50}, (_, i) => line(`p${i}`, 1))
  assert.deepEqual(applyCartOperation(full, op('merge', [line('otra', 1)])), full)
})
