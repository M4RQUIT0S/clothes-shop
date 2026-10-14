import assert from 'node:assert/strict'
import test from 'node:test'
import { parseGarment, parseStock, slugify } from '../lib/garment-form.ts'

const PHOTO = '0b9e8a52-6c1f-4f7e-9d43-2a5c8e1f7b30.jpg'

function form(fields: Record<string, string | string[]>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) for (const v of [value].flat()) data.append(name, v)
  return data
}

const complete = {
  name: '  Remera de lino  ', description: 'Lino lavado a piedra, corte recto y cuello reforzado.',
  price: '43900', category: 'camisetas', color: '#E7E5E4', photo: PHOTO,
  sizes: ['L', 'S'], 'stock-S': '3', 'stock-L': '0',
}

test('una prenda completa sale lista para guardar, con los talles en el orden de la tienda', () => {
  assert.deepEqual(parseGarment(form(complete)), {
    ok: true,
    garment: {
      slug: 'remera-de-lino', name: 'Remera de lino', description: complete.description,
      priceCents: 4390000, category: 'camisetas', color: '#e7e5e4', photo: PHOTO,
      stock: [{ size: 'S', stock: 3 }, { size: 'L', stock: 0 }],
    },
  })
})

test('ningún campo se puede dejar vacío ni con datos que no sirven', () => {
  const cases: Record<string, string | string[]>[] = [
    { name: '' }, { name: 'ab' }, { description: '' }, { description: 'Muy corta' },
    { price: '' }, { price: '0' }, { price: '43900.50' }, { price: '-5' },
    { category: '' }, { category: 'zapatos' }, { color: '' }, { color: 'rojo' },
    { photo: '' }, { photo: 'https://otro.sitio/foto.jpg' },
    { sizes: [] }, { sizes: ['XXXL'] }, { 'stock-S': '' }, { 'stock-L': '-1' }, { 'stock-L': '1.5' }, { 'stock-S': '10000' },
  ]
  for (const change of cases) {
    const result = parseGarment(form({ ...complete, ...change }))
    assert.equal(result.ok, false, JSON.stringify(change))
    if (!result.ok) assert.ok(result.error.length > 10, JSON.stringify(change))
  }
  const missing = form(complete)
  missing.delete('description')
  assert.equal(parseGarment(missing).ok, false)
})

test('el nombre da una URL legible y sin tildes', () => {
  assert.equal(slugify('Buzo «Ñandú» de algodón 100%'), 'buzo-nandu-de-algodon-100')
  assert.equal(parseGarment(form({ ...complete, name: '¡!¿?' })).ok, false)
})

test('el stock se pide para todos los talles de la prenda', () => {
  assert.deepEqual(parseStock(form({ 'stock-S': '4', 'stock-M': '0' }), ['S', 'M']),
    { ok: true, stock: [{ size: 'S', stock: 4 }, { size: 'M', stock: 0 }] })
  assert.equal(parseStock(form({ 'stock-S': '4' }), ['S', 'M']).ok, false)
  // Prendas de talle único: el talle es '' igual que en el carrito.
  assert.deepEqual(parseStock(form({ 'stock-': '2' }), ['']), { ok: true, stock: [{ size: '', stock: 2 }] })
})
