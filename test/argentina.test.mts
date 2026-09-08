// Unitarias: sin red y sin base de datos. Las de integración viven en *.test.mjs.
import assert from 'node:assert/strict'
import test from 'node:test'
import { PROVINCES, isPostalCode, normalizePostalCode } from '../lib/argentina.ts'

test('acepta los dos formatos de código postal', () => {
  assert.ok(isPostalCode('C1425DKE'), 'CPA de ocho caracteres')
  assert.ok(isPostalCode('1425'), 'el de cuatro dígitos de siempre')
  assert.ok(isPostalCode(' c1425dke '), 'con espacios y en minúsculas')
})

test('rechaza lo que no es un código postal', () => {
  for (const malo of ['', '142', '14250', 'C1425DK', 'C1425DKEX', 'CP1425', 'C142 5DKE']) {
    assert.ok(!isPostalCode(malo), `debería rechazar ${JSON.stringify(malo)}`)
  }
})

test('normalizePostalCode guarda un único CP canónico', () => {
  assert.equal(normalizePostalCode('  c1425dke '), 'C1425DKE')
  assert.equal(normalizePostalCode('1425'), '1425')
})

test('están las 24 jurisdicciones y ninguna repetida', () => {
  assert.equal(PROVINCES.length, 24)
  assert.equal(new Set(PROVINCES).size, 24)
})
