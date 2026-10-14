// Panel del vendedor: quién puede escribir el catálogo y qué exige la base a cada prenda.
import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import type { PGlite } from '@electric-sql/pglite'
import { migratedDb } from './support/db.mts'

const SELLER = '20000000-0000-4000-8000-000000000001'
const BUYER = '20000000-0000-4000-8000-000000000002'
let db: PGlite

before(async () => {
  db = await migratedDb()
  await db.query('insert into auth.users values ($1), ($2)', [SELLER, BUYER])
  await db.query('insert into sellers (user_id) values ($1)', [SELLER])
})
after(async () => { await db.close() })
beforeEach(async () => { await db.exec('delete from product_variants; delete from products; delete from storage.objects;') })

async function as(user: string | null, run: () => Promise<void>) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ''])
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`)
  try { await run() } finally { await db.exec('reset role') }
}

const garment = { slug: 'remera-lino', name: 'Remera de lino', description: 'Lino lavado, corte recto.', price: 4390000,
  image: 'https://x.test/remera.jpg', category: 'camisetas', color: '#e7e5e4',
  stock: [{ size: 'S', stock: 2 }, { size: 'M', stock: 0 }, { size: 'L', stock: 5 }] }
const create = (g = garment) => db.query<{ id: string }>(
  'select public.create_product($1, $2, $3, $4, $5, $6, $7, $8) as id',
  [g.slug, g.name, g.description, g.price, g.image, g.category, g.color, JSON.stringify(g.stock)])
const count = async (table: string) => (await db.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0].n
const isCode = (code: string) => (e: { code?: string }) => e.code === code

test('un vendedor da de alta la prenda con sus talles en orden y su stock', async () => {
  await as(SELLER, async () => { await create() })
  const product = await db.query<{ sizes: string[] }>('select sizes from products')
  assert.deepEqual(product.rows, [{ sizes: ['S', 'M', 'L'] }])
  const stock = await db.query('select size, stock from product_variants order by stock')
  assert.deepEqual(stock.rows, [{ size: 'M', stock: 0 }, { size: 'S', stock: 2 }, { size: 'L', stock: 5 }])
})

test('el alta es atómica: si falla el stock no queda una prenda a medias', async () => {
  await as(SELLER, async () => {
    await assert.rejects(create({ ...garment, stock: [{ size: 'S', stock: -1 }] }), isCode('23514'))
  })
  assert.equal(await count('products'), 0)
})

test('la base rechaza prendas sin nombre, descripción, foto o precio aunque se evite el panel', async () => {
  await as(SELLER, async () => {
    for (const bad of [{ name: ' ' }, { description: '' }, { image: '' }, { price: 0 }]) {
      await assert.rejects(create({ ...garment, ...bad }), isCode('23514'))
    }
  })
})

test('un vendedor cambia el stock y elimina la prenda junto con sus talles', async () => {
  await as(SELLER, async () => {
    const { id } = (await create()).rows[0]
    await db.query("update product_variants set stock = 9 where product_id = $1 and size = 'M'", [id])
    const m = await db.query("select stock from product_variants where product_id = $1 and size = 'M'", [id])
    assert.deepEqual(m.rows, [{ stock: 9 }])
    await db.query('delete from products where id = $1', [id])
  })
  assert.equal(await count('products'), 0)
  assert.equal(await count('product_variants'), 0)
})

test('un comprador o un visitante no pueden tocar el catálogo ni ver quién vende', async () => {
  let id = ''
  await as(SELLER, async () => { id = (await create()).rows[0].id })
  await as(BUYER, async () => {
    await assert.rejects(create({ ...garment, slug: 'otra' }), isCode('42501'))
    await db.query('update product_variants set stock = 99 where product_id = $1', [id])
    await db.query('delete from products where id = $1', [id])
    assert.deepEqual((await db.query('select * from sellers')).rows, [])
  })
  await as(null, async () => {
    await assert.rejects(create({ ...garment, slug: 'otra' }), isCode('42501'))
    await assert.rejects(db.query('select * from sellers'), isCode('42501'))
  })
  assert.equal(await count('products'), 1)
  const stock = await db.query<{ total: number }>('select sum(stock)::int as total from product_variants')
  assert.equal(stock.rows[0].total, 7)
})

test('sólo los vendedores suben fotos, y sólo al bucket de prendas', async () => {
  const upload = (bucket: string) => db.query('insert into storage.objects (bucket_id, name) values ($1, $2)', [bucket, `${crypto.randomUUID()}.jpg`])
  await db.query("insert into storage.buckets (id, name) values ('otro', 'otro') on conflict do nothing")
  await as(SELLER, async () => {
    await upload('prendas')
    await assert.rejects(upload('otro'), isCode('42501'))
  })
  await as(BUYER, async () => { await assert.rejects(upload('prendas'), isCode('42501')) })
  await as(null, async () => { await assert.rejects(upload('prendas'), isCode('42501')) })
  assert.equal(await count('storage.objects'), 1)
})
