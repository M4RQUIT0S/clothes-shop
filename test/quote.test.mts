// Unitarias de la cotización: lo que el servidor acepta vender y por cuánto.
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildQuote, quoteFingerprint, type QuoteProduct } from '../lib/checkout/quote.ts'
import { SHIPPING_CENTS, SHIPPING_FREE_FROM } from '../lib/shop.ts'

const remera: QuoteProduct = {
  slug: 'remera', name: 'Remera', price_cents: 1_000_000, sale_price_cents: null,
  sizes: ['S', 'M', 'L'],
  variants: [{ size: 'S', stock: 0 }, { size: 'M', stock: 3 }, { size: 'L', stock: 10 }],
}
const jean: QuoteProduct = {
  slug: 'jean', name: 'Jean', price_cents: 2_000_000, sale_price_cents: 1_500_000,
  sizes: ['40'], variants: [{ size: '40', stock: 5 }],
}

test('cotiza con el precio vigente, rebajas incluidas, y suma el envío', () => {
  const { quote, problems } = buildQuote([remera, jean], [
    { slug: 'remera', size: 'M', qty: 2 },
    { slug: 'jean', size: '40', qty: 1 },
  ])
  assert.deepEqual(problems, [])
  assert.deepEqual(quote.lines.map((l) => [l.slug, l.unit_price_cents, l.line_total_cents]), [
    ['remera', 1_000_000, 2_000_000],
    ['jean', 1_500_000, 1_500_000],
  ])
  assert.equal(quote.subtotal_cents, 3_500_000)
  assert.equal(quote.shipping_cents, SHIPPING_CENTS)
  assert.equal(quote.total_cents, 3_500_000 + SHIPPING_CENTS)
})

test('el envío es gratis desde el umbral también en la cotización', () => {
  const qty = Math.ceil(SHIPPING_FREE_FROM / remera.price_cents)
  const { quote } = buildQuote([{ ...remera, variants: [{ size: 'L', stock: 50 }] }], [
    { slug: 'remera', size: 'L', qty },
  ])
  assert.equal(quote.shipping_cents, 0)
})

test('rechaza prendas inexistentes, talles que no se venden y faltantes de stock', () => {
  const { quote, problems } = buildQuote([remera], [
    { slug: 'fantasma', size: 'M', qty: 1 },
    { slug: 'remera', size: 'XXL', qty: 1 },
    { slug: 'remera', size: 'S', qty: 1 },
    { slug: 'remera', size: 'M', qty: 4 },
    { slug: 'remera', size: 'L', qty: 10 },
  ])
  assert.deepEqual(problems, [
    { slug: 'fantasma', size: 'M', reason: 'not_found', available: 0 },
    { slug: 'remera', size: 'XXL', reason: 'size_not_sold', available: 0 },
    { slug: 'remera', size: 'S', reason: 'sold_out', available: 0 },
    { slug: 'remera', size: 'M', reason: 'insufficient', available: 3 },
  ])
  // Lo que sí se puede vender sigue cotizado, para mostrarlo junto a los problemas.
  assert.deepEqual(quote.lines.map((l) => [l.slug, l.size]), [['remera', 'L']])
})

test('un talle listado sin fila de stock cuenta como agotado, no como ilimitado', () => {
  const { problems } = buildQuote([{ ...remera, variants: [] }], [{ slug: 'remera', size: 'M', qty: 1 }])
  assert.deepEqual(problems, [{ slug: 'remera', size: 'M', reason: 'sold_out', available: 0 }])
})

test('la huella cambia si cambia cualquier cosa que se cobra, y sólo entonces', () => {
  const items = [{ slug: 'remera', size: 'M', qty: 1 }]
  const base = quoteFingerprint(buildQuote([remera], items).quote)
  assert.equal(quoteFingerprint(buildQuote([remera], items).quote), base)
  assert.equal(quoteFingerprint(buildQuote([{ ...remera, name: 'Otro nombre' }], items).quote), base)
  assert.notEqual(quoteFingerprint(buildQuote([{ ...remera, sale_price_cents: 900_000 }], items).quote), base)
  assert.notEqual(quoteFingerprint(buildQuote([remera], [{ ...items[0], qty: 2 }]).quote), base)
  assert.notEqual(quoteFingerprint(buildQuote([remera], [{ ...items[0], size: 'L' }]).quote), base)
})

test('una prenda sin talles se vende con el talle vacío, como la guarda el carrito', () => {
  const bufanda: QuoteProduct = {
    slug: 'bufanda', name: 'Bufanda', price_cents: 500_000, sale_price_cents: null,
    sizes: [], variants: [{ size: '', stock: 2 }],
  }
  const { quote, problems } = buildQuote([bufanda], [{ slug: 'bufanda', size: '', qty: 2 }])
  assert.deepEqual(problems, [])
  assert.equal(quote.subtotal_cents, 1_000_000)
  assert.deepEqual(buildQuote([bufanda], [{ slug: 'bufanda', size: 'M', qty: 1 }]).problems[0].reason, 'size_not_sold')
})
