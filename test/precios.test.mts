// Unitarias del cálculo de lo que se cobra. Lo comparten ficha, tarjeta, carrito
// y checkout, así que un fallo aquí se cobra de verdad.
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SHIPPING_CENTS,
  SHIPPING_FREE_FROM,
  discountPct,
  formatPrice,
  isOnSale,
  shippingFor,
  unitPrice,
} from '../lib/shop.ts'

test('una rebaja sólo cuenta si de verdad baja el precio', () => {
  assert.equal(isOnSale({ price_cents: 1000, sale_price_cents: 800 }), true)
  assert.equal(isOnSale({ price_cents: 1000, sale_price_cents: 1000 }), false)
  assert.equal(isOnSale({ price_cents: 1000, sale_price_cents: 1200 }), false)
  assert.equal(isOnSale({ price_cents: 1000, sale_price_cents: null }), false)
  // un cero es un error de carga, no una promoción: cobrarlo sería regalar la prenda
  assert.equal(isOnSale({ price_cents: 1000, sale_price_cents: 0 }), false)
})

test('unitPrice nunca regala nada por una fila mal cargada', () => {
  assert.equal(unitPrice({ price_cents: 1000, sale_price_cents: 800 }), 800)
  assert.equal(unitPrice({ price_cents: 1000, sale_price_cents: null }), 1000)
  assert.equal(unitPrice({ price_cents: 1000, sale_price_cents: 1200 }), 1000)
  assert.equal(unitPrice({ price_cents: 1000, sale_price_cents: 0 }), 1000)
})

test('discountPct redondea al entero y calla si no hay rebaja', () => {
  assert.equal(discountPct({ price_cents: 1000, sale_price_cents: 750 }), 25)
  assert.equal(discountPct({ price_cents: 999, sale_price_cents: 666 }), 33)
  assert.equal(discountPct({ price_cents: 1000, sale_price_cents: null }), 0)
})

test('los pesos se pintan sin decimales', () => {
  assert.match(formatPrice(249000), /2\.490/)
  assert.doesNotMatch(formatPrice(249000), /,\d/)
})

test('el envío es gratis justo en el umbral anunciado, no un peso después', () => {
  assert.equal(shippingFor(SHIPPING_FREE_FROM), 0)
  assert.equal(shippingFor(SHIPPING_FREE_FROM - 1), SHIPPING_CENTS)
  assert.equal(shippingFor(SHIPPING_FREE_FROM + 1), 0)
})

test('un carrito vacío no paga portes', () => {
  assert.equal(shippingFor(0), 0)
})
