import assert from 'node:assert/strict'
import test from 'node:test'
import { addCartItem, readSavedCart, setCartQuantity, type CartItem } from '../lib/cart.ts'

const shirt: CartItem = {
  slug: 'remera-lino', name: 'Remera de lino', size: 'M', qty: 1,
  price_cents: 2490000, image_url: '/remera.jpg', color: '#ffffff',
}

test('editar con cantidad vacía, cero o inválida no elimina la prenda', () => {
  const items = [shirt]
  for (const qty of [Number(''), -1, NaN, Infinity, 1.5, 21]) {
    assert.deepEqual(setCartQuantity(items, shirt.slug, shirt.size, qty), items)
  }
})

test('cambiar cantidad mantiene las otras prendas y no muta el carrito anterior', () => {
  const other = { ...shirt, size: 'L', qty: 3 }
  const items = [shirt, other]
  const next = setCartQuantity(items, shirt.slug, shirt.size, 2)
  assert.equal(next[0].qty, 2)
  assert.equal(items[0].qty, 1)
  assert.deepEqual(next[1], other)
})

test('añadir otra unidad combina sólo el mismo producto y talle', () => {
  const result = addCartItem([shirt], { ...shirt })
  assert.equal(result.error, undefined)
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].qty, 2)
  assert.equal(shirt.qty, 1)
  const otherSize = addCartItem([shirt], { ...shirt, size: 'L' })
  assert.equal(otherSize.items.length, 2)
})

test('al llegar a 20 unidades no agrega y explica el límite', () => {
  const items = [{ ...shirt, qty: 20 }]
  const result = addCartItem(items, shirt)
  assert.deepEqual(result.items, items)
  assert.match(result.error ?? '', /20/)
})

test('no agrega cantidades inválidas ni supera 50 líneas del checkout', () => {
  assert.ok(addCartItem([], { ...shirt, qty: 0 }).error)
  assert.ok(addCartItem([], { ...shirt, qty: 21 }).error)
  const items = Array.from({ length: 50 }, (_, i) => ({ ...shirt, slug: `prenda-${i}` }))
  const result = addCartItem(items, shirt)
  assert.equal(result.items.length, 50)
  assert.match(result.error ?? '', /50/)
})

test('un carrito guardado corrupto no rompe la página y avisa del problema', () => {
  for (const raw of ['{', '{}', 'null', '[null]', '[42]']) {
    const result = readSavedCart(raw)
    assert.deepEqual(result.items, [])
    assert.ok(result.warning)
  }
  assert.deepEqual(readSavedCart(null), { items: [] })
})

test('recupera las prendas válidas y avisa cuando otra línea no se puede recuperar', () => {
  const result = readSavedCart(JSON.stringify([shirt, { ...shirt, size: 'L', qty: -1 }]))
  assert.deepEqual(result.items, [shirt])
  assert.ok(result.warning)
  assert.deepEqual(readSavedCart(JSON.stringify([shirt])), { items: [shirt] })
})

test('no recupera cantidades excesivas, duplicados ni precios inválidos', () => {
  const result = readSavedCart(JSON.stringify([shirt, shirt, { ...shirt, size: 'L', price_cents: -1 }]))
  assert.deepEqual(result.items, [shirt])
  assert.ok(result.warning)
  assert.deepEqual(readSavedCart(JSON.stringify([{ ...shirt, qty: 21 }])).items, [])
})
