import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { verifyWebhookSignature } from '../lib/mercadopago.ts'

const secret = 'clave-secreta-de-notificaciones'
const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex')
const requestId = 'bb56a2f1-6aae-46ac-982e-9dcd3581d08e'
const ts = '1742505638683'

test('acepta la firma calculada como documenta Mercado Pago', () => {
  const v1 = sign(`id:123456;request-id:${requestId};ts:${ts};`)
  assert.equal(verifyWebhookSignature({ secret, xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId: '123456' }), true)
  // Espacios alrededor de las partes, como los toleran los SDK oficiales.
  assert.equal(verifyWebhookSignature({ secret, xSignature: ` ts=${ts} , v1=${v1} `, xRequestId: requestId, dataId: '123456' }), true)
})

test('sin x-request-id el segmento se omite, no se deja vacío', () => {
  const v1 = sign(`id:123456;ts:${ts};`)
  assert.equal(verifyWebhookSignature({ secret, xSignature: `ts=${ts},v1=${v1}`, xRequestId: null, dataId: '123456' }), true)
  assert.equal(verifyWebhookSignature({ secret, xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId: '123456' }), false)
})

test('un data.id alfanumérico vale tal cual o en minúsculas, porque la doc y los SDK discrepan', () => {
  for (const manifestId of ['ORD01JQ4S4KY8HWQ6NA5PXB65B3D3', 'ord01jq4s4ky8hwq6na5pxb65b3d3']) {
    const v1 = sign(`id:${manifestId};request-id:${requestId};ts:${ts};`)
    assert.equal(verifyWebhookSignature({ secret, xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId: 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3' }), true, manifestId)
  }
})

test('rechaza firmas alteradas, de otro aviso o mal formadas sin lanzar', () => {
  const v1 = sign(`id:123456;request-id:${requestId};ts:${ts};`)
  const flipped = (v1[0] === 'a' ? 'b' : 'a') + v1.slice(1)
  const cases: [string | null, string][] = [
    [`ts=${ts},v1=${flipped}`, 'v1 alterado'],
    [`ts=${Number(ts) + 1},v1=${v1}`, 'otro ts'],
    [`ts=${ts},v1=${v1.slice(2)}`, 'v1 corto'],
    [`ts=${ts}`, 'sin v1'],
    [`v1=${v1}`, 'sin ts'],
    [`ts=abc,v1=${v1}`, 'ts no numérico'],
    ['basura', 'sin pares'],
    ['', 'vacía'],
    [null, 'ausente'],
  ]
  for (const [xSignature, label] of cases) {
    assert.equal(verifyWebhookSignature({ secret, xSignature, xRequestId: requestId, dataId: '123456' }), false, label)
  }
  assert.equal(verifyWebhookSignature({ secret, xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId: '999' }), false, 'otro pago')
  assert.equal(verifyWebhookSignature({ secret: 'otra', xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId: '123456' }), false, 'otro secreto')
})
