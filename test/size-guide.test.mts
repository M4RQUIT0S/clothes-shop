import assert from 'node:assert/strict'
import test from 'node:test'
import { sizeGuideFor } from '../lib/size-guide.ts'

test('la tabla sólo trae los talles que se venden, en su orden', () => {
  const guide = sizeGuideFor({ slug: 'remera-x', category: 'camisetas', sizes: ['L', 'S'] })
  assert.deepEqual(guide?.rows.map((r) => r.size), ['L', 'S'])
  assert.equal(guide?.rows[0].values.length, guide?.columns.length)
})

test('el corte propio de una prenda manda sobre el de su categoría', () => {
  const regular = sizeGuideFor({ slug: 'remera-x', category: 'camisetas', sizes: ['M'] })
  const oversize = sizeGuideFor({ slug: 'camiseta-oversize-negra', category: 'camisetas', sizes: ['M'] })
  assert.ok(oversize!.rows[0].values[0] > regular!.rows[0].values[0])
})

test('sin medidas para la categoría o los talles no hay tabla', () => {
  assert.equal(sizeGuideFor({ slug: 'x', category: 'accesorios', sizes: ['U'] }), null)
  assert.equal(sizeGuideFor({ slug: 'x', category: 'pantalones', sizes: ['XXS'] }), null)
  assert.equal(sizeGuideFor({ slug: 'x', category: 'camisetas', sizes: [] }), null)
})
