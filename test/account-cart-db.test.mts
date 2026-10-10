import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import type { PGlite } from '@electric-sql/pglite'
import { migratedDb } from './support/db.mts'

const A = '10000000-0000-4000-8000-000000000001'
const B = '10000000-0000-4000-8000-000000000002'
let db: PGlite
before(async () => {
  db = await migratedDb()
  await db.query('insert into auth.users values ($1), ($2)', [A, B])
})
after(async () => { await db.close() })
async function as(user: string | null, run: () => Promise<void>) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ''])
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`)
  try { await run() } finally { await db.exec('reset role') }
}
const mutate = async (id: string, kind: string, lines: unknown[]) =>
  (await db.query<{items: unknown}>('select public.mutate_account_cart($1, $2, $3) as items', [id, kind, JSON.stringify(lines)])).rows[0].items

test('reintentar la operación no duplica cantidades y reutilizarla con otro cuerpo falla', async () => {
  await as(A, async () => {
    const id = crypto.randomUUID()
    const lines = [{slug: 'remera', size: 'M', qty: 2}]
    assert.deepEqual(await mutate(id, 'add', lines), lines)
    assert.deepEqual(await mutate(id, 'add', lines), lines)
    await assert.rejects(mutate(id, 'add', [{...lines[0], qty: 3}]))
  })
})
test('RLS y permisos impiden leer o modificar otra cuenta y no exponen operaciones', async () => {
  await as(B, async () => {
    assert.deepEqual((await db.query('select * from account_carts')).rows, [])
    await assert.rejects(db.query('update account_carts set items = $1 where user_id = $2', ['[]', A]))
    await assert.rejects(db.query('select * from cart_operations'))
  })
  await as(null, async () => {
    await assert.rejects(db.query('select * from account_carts'))
    await assert.rejects(mutate(crypto.randomUUID(), 'add', [{slug: 'x', size: 'M', qty: 1}]))
  })
})
test('el servidor valida tipos, campos faltantes y cantidades aunque se evite la UI', async () => {
  await as(A, async () => {
    for (const line of [{slug: 'x', size: 'M'}, {slug: 'x', size: 'M', qty: -1}, {slug: 'x', size: 'M', qty: 21}, {slug: 'x', size: null, qty: 1}]) {
      await assert.rejects(mutate(crypto.randomUUID(), 'add', [line]))
    }
  })
})
test('cambios de diferentes prendas se conservan y vaciar carrito no borra pedidos', async () => {
  await as(A, async () => {
    await mutate(crypto.randomUUID(), 'add', [{slug: 'jean', size: '40', qty: 1}])
    const result = await mutate(crypto.randomUUID(), 'set', [{slug: 'remera', size: 'M', qty: 3}]) as unknown[]
    assert.equal(result.length, 2)
  })
  await db.query("insert into orders(email,full_name,address,items,total_cents,status,user_id) values('a@example.test','Ana','Calle 1','[]',100,'paid',$1)", [A])
  await as(A, async () => { assert.deepEqual(await mutate(crypto.randomUUID(), 'clear', []), []) })
  assert.equal((await db.query<{n: number}>('select count(*) as n from orders')).rows[0].n, 1)
  await db.query('delete from auth.users where id=$1', [A])
  assert.equal((await db.query<{user_id: string | null}>('select user_id from orders')).rows[0].user_id, null)
})

test('una importación que excede 50 líneas no bloquea el carrito ni los siguientes cambios', async () => {
  await as(B, async () => {
    const full = Array.from({length: 50}, (_, i) => ({slug:`prenda${i}`,size:'M',qty:1}))
    await mutate(crypto.randomUUID(), 'merge', full)
    const result = await mutate(crypto.randomUUID(), 'merge', [{slug:'otra',size:'M',qty:1}]) as unknown[]
    assert.equal(result.length, 50)
    await mutate(crypto.randomUUID(), 'remove', [{slug:'prenda0',size:'M',qty:0}])
    const updated = await mutate(crypto.randomUUID(), 'add', [{slug:'otra',size:'M',qty:1}]) as unknown[]
    assert.equal(updated.length, 50)
  })
})
