import assert from 'node:assert/strict'
import test from 'node:test'
import { receiptToken, verifyReceiptToken } from '../lib/checkout/receipt-token.ts'

const secret = 'x'.repeat(32)
const order = '6f1c2e0a-1b2c-4d5e-8f90-123456789abc'

test('el mismo pedido da siempre el mismo enlace, y sólo ese pedido lo abre', () => {
  const token = receiptToken(secret, order)
  assert.equal(receiptToken(secret, order), token)
  assert.match(token, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(verifyReceiptToken(secret, order, token), true)
  assert.equal(verifyReceiptToken(secret, '00000000-0000-4000-8000-000000000000', token), false)
})

test('un token alterado, ajeno, vacío o de otro secreto no abre el recibo', () => {
  const token = receiptToken(secret, order)
  const flipped = (token[0] === 'A' ? 'B' : 'A') + token.slice(1)
  for (const bad of [flipped, token.slice(1), '', 'a'.repeat(43), `${token}=`, undefined, null, ['x']]) {
    assert.equal(verifyReceiptToken(secret, order, bad), false, String(bad))
  }
  assert.equal(verifyReceiptToken('y'.repeat(32), order, token), false)
})

test('un secreto corto es un error de configuración, no un enlace débil', () => {
  assert.throws(() => receiptToken('corto', order), /RECEIPT_SECRET/)
  assert.throws(() => verifyReceiptToken('corto', order, 'x'), /RECEIPT_SECRET/)
})
