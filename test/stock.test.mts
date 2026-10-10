import assert from 'node:assert/strict'
import test from 'node:test'
import { isSoldOut, stockFor } from '../lib/shop.ts'

const remera = { sizes: ['S', 'M'], product_variants: [{ size: 'S', stock: 0 }, { size: 'M', stock: 4 }] }

test('el stock se lee por talle y un talle sin fila cuenta como agotado', () => {
  assert.equal(stockFor(remera, 'M'), 4)
  assert.equal(stockFor(remera, 'S'), 0)
  assert.equal(stockFor(remera, 'XL'), 0)
  assert.equal(stockFor({ product_variants: undefined }, 'M'), 0)
})

test('una prenda está agotada sólo si no queda ningún talle', () => {
  assert.equal(isSoldOut(remera), false)
  assert.equal(isSoldOut({ ...remera, product_variants: [{ size: 'S', stock: 0 }] }), true)
  // Talle único: se vende como '' igual que en el carrito y en el servidor.
  assert.equal(isSoldOut({ sizes: [], product_variants: [{ size: '', stock: 1 }] }), false)
  assert.equal(isSoldOut({ sizes: [], product_variants: [] }), true)
})
