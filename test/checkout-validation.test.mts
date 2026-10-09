import assert from 'node:assert/strict'
import test from 'node:test'
import { CheckoutSchema } from '../lib/checkout-schema.ts'
import { ADDRESS_MAX_LENGTH, NAME_MAX_LENGTH } from '../lib/checkout-fields.ts'
import { POSTAL_CODE_PATTERN } from '../lib/argentina.ts'

const valid = {
  full_name: 'Persona de prueba', email: 'persona@example.com', address: 'Mitre 123',
  province: 'Buenos Aires', postal_code: '1425',
  items: [{ slug: 'remera-lino', size: 'M', qty: 1 }],
}

test('acepta dirección corta y normaliza espacios sin rechazar datos válidos', () => {
  const result = CheckoutSchema.parse({ ...valid, email: ' persona@example.com ', postal_code: ' c1425dke ' })
  assert.equal(result.address, 'Mitre 123')
  assert.equal(result.email, 'persona@example.com')
  assert.equal(result.postal_code, 'C1425DKE')
})

test('patrón del navegador acepta ambos CP y espacios externos, no formatos inventados', () => {
  const pattern = new RegExp(`^(?:${POSTAL_CODE_PATTERN})$`, 'v')
  for (const code of ['1425', ' c1425dke ', ' C1425DKE ']) assert.ok(pattern.test(code))
  for (const code of ['142', 'CP1425', 'C142 5DKE', '']) assert.ok(!pattern.test(code))
})

test('rechaza nombre o dirección vacíos y longitudes excesivas con mensajes útiles', () => {
  for (const invalid of [
    { address: '  ' }, { full_name: ' ' }, { email: 'no-es-email' },
    { address: 'a'.repeat(ADDRESS_MAX_LENGTH + 1) },
    { full_name: 'a'.repeat(NAME_MAX_LENGTH + 1) },
  ]) {
    const result = CheckoutSchema.safeParse({ ...valid, ...invalid })
    assert.equal(result.success, false)
    if (!result.success) assert.ok(result.error.issues[0].message.length > 0)
  }
})

test('no permite cantidades inválidas ni el mismo producto y talle duplicados', () => {
  for (const qty of [0, -1, 21, 1.5]) {
    assert.equal(CheckoutSchema.safeParse({ ...valid, items: [{ ...valid.items[0], qty }] }).success, false)
  }
  assert.equal(CheckoutSchema.safeParse({ ...valid, items: [valid.items[0], valid.items[0]] }).success, false)
})
