import assert from 'node:assert/strict'
import test from 'node:test'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const headers = { apikey: key, Authorization: `Bearer ${key}` }

test('el catálogo es legible con la clave pública', async () => {
  const res = await fetch(`${url}/rest/v1/products?select=slug,price_cents&limit=5`, { headers })
  assert.equal(res.status, 200)
  const rows = await res.json()
  assert.ok(rows.length > 0, 'no hay productos sembrados')
  assert.ok(rows.every((r) => Number.isInteger(r.price_cents) && r.price_cents > 0))
})

test('los pedidos no se pueden leer desde el cliente', async () => {
  const res = await fetch(`${url}/rest/v1/orders?select=email`, { headers })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), [], 'RLS deja escapar pedidos ajenos')
})

test('se puede crear un pedido pero no leerlo de vuelta', async () => {
  const res = await fetch(`${url}/rest/v1/orders`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Test Runner',
      email: 'test@example.com',
      address: 'Calle Falsa 123, Madrid',
      items: [{ slug: 'camiseta-oversize-negra', size: 'M', qty: 1, unit_price_cents: 2990 }],
      total_cents: 2990,
    }),
  })
  assert.equal(res.status, 201)
  assert.equal(await res.text(), '', 'el insert no debería devolver la fila')
})
