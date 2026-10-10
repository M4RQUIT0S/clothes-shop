// La migración del checkout y confirm_order_payment contra Postgres real en memoria.
// PGlite tiene una sola conexión: los bloqueos se ejecutan pero no se pueden poner a
// competir; la idempotencia se prueba repitiendo llamadas en secuencia.
import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { applyMigration, migratedDb, migrationFiles } from './support/db.mts'

const CHECKOUT = '20261009150000_checkout_payments.sql'
let db: PGlite

before(async () => { db = await migratedDb() })
after(async () => { await db.close() })
beforeEach(async () => {
  await db.exec('delete from orders; delete from product_variants; delete from products;')
  await db.exec(`
    insert into products (slug, name, price_cents, sizes, stock) values
      ('remera', 'Remera', 1000000, '{M,L}', 99),
      ('jean', 'Jean', 2000000, '{40}', 99);
    insert into product_variants (product_id, size, stock)
      select id, 'M', 2 from products where slug = 'remera' union all
      select id, 'L', 1 from products where slug = 'remera' union all
      select id, '40', 5 from products where slug = 'jean';
  `)
})

let n = 0
async function order(items: { slug: string; size: string; qty: number }[], total = 0, status = 'awaiting_payment') {
  const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
  await db.query(
    `insert into orders (id, email, full_name, address, items, total_cents, status)
     values ($1, 'a@b.ar', 'Ana', 'Mitre 1', $2, $3, $4)`,
    [id, JSON.stringify(items), total, status],
  )
  return id
}

const confirm = async (orderId: string, paymentId: string, status: string, amount: number, currency = 'ARS') =>
  (await db.query<{ r: string }>('select confirm_order_payment($1, $2, $3, $4, $5) as r', [orderId, paymentId, status, amount, currency])).rows[0].r

const stock = async (slug: string, size: string) =>
  (await db.query<{ stock: number }>(
    'select v.stock from product_variants v join products p on p.id = v.product_id where p.slug = $1 and v.size = $2', [slug, size],
  )).rows[0].stock

const row = async (id: string) =>
  (await db.query<{ status: string; payment_id: string | null; payment_status: string | null; paid_at: string | null; review_reason: string | null }>(
    'select status, payment_id, payment_status, paid_at, review_reason from orders where id = $1', [id],
  )).rows[0]

test('un pago aprobado marca el pedido y descuenta cada talle una sola vez', async () => {
  const id = await order([{ slug: 'remera', size: 'M', qty: 2 }, { slug: 'jean', size: '40', qty: 1 }], 4_000_000)
  assert.equal(await confirm(id, 'p1', 'approved', 4_000_000), 'paid')
  assert.deepEqual([await stock('remera', 'M'), await stock('jean', '40')], [0, 4])
  assert.equal((await row(id)).payment_id, 'p1')
  assert.ok((await row(id)).paid_at)
  // La misma notificación otra vez no vuelve a descontar.
  assert.equal(await confirm(id, 'p1', 'approved', 4_000_000), 'paid')
  assert.deepEqual([await stock('remera', 'M'), await stock('jean', '40')], [0, 4])
})

test('si falta stock al aprobarse, va a revisión sin descuentos parciales', async () => {
  const id = await order([{ slug: 'jean', size: '40', qty: 1 }, { slug: 'remera', size: 'M', qty: 3 }], 5_000_000)
  assert.equal(await confirm(id, 'p1', 'approved', 5_000_000), 'needs_review')
  assert.deepEqual([await stock('remera', 'M'), await stock('jean', '40')], [2, 5])
  assert.match((await row(id)).review_reason ?? '', /stock/)
})

test('líneas repetidas se suman antes de comparar con el stock', async () => {
  const id = await order([{ slug: 'remera', size: 'L', qty: 1 }, { slug: 'remera', size: 'L', qty: 1 }], 2_000_000)
  assert.equal(await confirm(id, 'p1', 'approved', 2_000_000), 'needs_review')
  assert.equal(await stock('remera', 'L'), 1)
})

test('importe o moneda distintos al pedido van a revisión y no descuentan', async () => {
  const cheap = await order([{ slug: 'remera', size: 'M', qty: 1 }], 1_000_000)
  assert.equal(await confirm(cheap, 'p1', 'approved', 999_999), 'needs_review')
  const usd = await order([{ slug: 'remera', size: 'M', qty: 1 }], 1_000_000)
  assert.equal(await confirm(usd, 'p2', 'approved', 1_000_000, 'USD'), 'needs_review')
  assert.equal(await stock('remera', 'M'), 2)
})

test('un rechazo no cierra el pedido: un reintento aprobado lo paga', async () => {
  const id = await order([{ slug: 'remera', size: 'M', qty: 1 }], 1_000_000)
  assert.equal(await confirm(id, 'p1', 'rejected', 1_000_000), 'payment_failed')
  assert.equal(await confirm(id, 'p2', 'approved', 1_000_000), 'paid')
  assert.equal(await stock('remera', 'M'), 1)
})

test('los avisos desordenados no reabren ni tumban intentos equivocados', async () => {
  const id = await order([{ slug: 'remera', size: 'M', qty: 1 }], 1_000_000)
  assert.equal(await confirm(id, 'p1', 'rejected', 1_000_000), 'payment_failed')
  // «pendiente» atrasado del mismo intento ya rechazado: no lo reabre.
  assert.equal(await confirm(id, 'p1', 'pending', 1_000_000), 'payment_failed')
  // Nuevo intento pendiente (por ejemplo, Rapipago): vuelve a esperar el pago.
  assert.equal(await confirm(id, 'p2', 'pending', 1_000_000), 'awaiting_payment')
  // Rechazo atrasado del intento viejo mientras el nuevo sigue vivo: se ignora.
  assert.equal(await confirm(id, 'p1', 'rejected', 1_000_000), 'awaiting_payment')
  assert.equal((await row(id)).payment_id, 'p2')
})

test('devolución o segundo cobro sobre un pedido pagado lo mandan a revisión, sin reponer stock', async () => {
  const refunded = await order([{ slug: 'remera', size: 'M', qty: 1 }], 1_000_000)
  await confirm(refunded, 'p1', 'approved', 1_000_000)
  assert.equal(await confirm(refunded, 'p1', 'refunded', 1_000_000), 'needs_review')
  assert.equal(await stock('remera', 'M'), 1)
  const twice = await order([{ slug: 'jean', size: '40', qty: 1 }], 2_000_000)
  await confirm(twice, 'p2', 'approved', 2_000_000)
  assert.equal(await confirm(twice, 'p3', 'approved', 2_000_000), 'needs_review')
  assert.match((await row(twice)).review_reason ?? '', /segundo pago/)
  // Un pago viejo rechazado que llega tarde no toca el pedido pagado.
  assert.equal(await confirm(twice, 'p0', 'rejected', 2_000_000), 'needs_review')
})

test('pedidos inexistentes o de la demo anterior no se tocan', async () => {
  assert.equal(await confirm('00000000-0000-4000-8000-999999999999', 'p1', 'approved', 1), 'not_found')
  const legacy = await order([{ slug: 'remera', size: 'M', qty: 1 }], 1_000_000, 'pending')
  assert.equal(await confirm(legacy, 'p1', 'approved', 1_000_000), 'pending')
  assert.equal(await stock('remera', 'M'), 2)
})

test('ni anon ni authenticated pueden confirmar pagos; service_role sí', async () => {
  const id = await order([{ slug: 'remera', size: 'M', qty: 1 }], 1_000_000)
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.exec(`set local role ${role}`)
        await tx.query("select confirm_order_payment($1, 'p', 'approved', 1000000, 'ARS')", [id])
      }),
      (error: { code?: string }) => error.code === '42501',
      role,
    )
  }
  const result = await db.transaction(async (tx) => {
    await tx.exec('set local role service_role')
    return (await tx.query<{ r: string }>("select confirm_order_payment($1, 'p', 'approved', 1000000, 'ARS') as r", [id])).rows[0].r
  })
  assert.equal(result, 'paid')
})

test('el stock por talle se lee en público pero no se escribe; los pedidos no se ven', async () => {
  await order([{ slug: 'remera', size: 'M', qty: 1 }], 1_000_000)
  await db.transaction(async (tx) => {
    await tx.exec('set local role anon')
    assert.equal((await tx.query('select * from product_variants')).rows.length, 3)
    assert.equal((await tx.query('select * from orders')).rows.length, 0)
  })
  await assert.rejects(db.transaction(async (tx) => {
    await tx.exec('set local role anon')
    await tx.exec("update product_variants set stock = 999")
    // Sin política de escritura, RLS filtra todas las filas: la actualización no toca nada.
    const { rows } = await tx.query<{ stock: number }>('select max(stock) as stock from product_variants')
    if (rows[0].stock === 999) throw new Error('anon cambió el stock')
    throw new Error('sin cambios')
  }), /sin cambios/)
})

test('la clave idempotente es única y el estado sólo admite valores conocidos', async () => {
  const insert = (id: string, key: string, status = 'awaiting_payment') => db.query(
    `insert into orders (id, email, full_name, address, items, total_cents, status, idempotency_key)
     values ($1, 'a@b.ar', 'Ana', 'Mitre 1', '[]', 0, $3, $2)`, [id, key, status])
  const key = '0b3f6a52-8f0e-4d64-9a59-0f5d4c3b2a10'
  await insert('10000000-0000-4000-8000-000000000001', key)
  await assert.rejects(insert('10000000-0000-4000-8000-000000000002', key), (e: { code?: string }) => e.code === '23505')
  await assert.rejects(insert('10000000-0000-4000-8000-000000000003', '1b3f6a52-8f0e-4d64-9a59-0f5d4c3b2a10', 'pagado'),
    (e: { code?: string }) => e.code === '23514')
})

test('sobre datos existentes: un talle por fila en cero y los pedidos de la demo intactos', async () => {
  const old = await migratedDb({ until: CHECKOUT })
  try {
    await old.exec(`
      insert into products (slug, name, price_cents, sizes, stock) values
        ('remera', 'Remera', 1000, '{S,M}', 40), ('bufanda', 'Bufanda', 500, '{}', 3);
      insert into orders (email, full_name, address, items, total_cents) values ('a@b.ar', 'Ana', 'x', '[]', 1000);
    `)
    await applyMigration(old, CHECKOUT)
    const variants = await old.query<{ slug: string; size: string; stock: number }>(
      'select p.slug, v.size, v.stock from product_variants v join products p on p.id = v.product_id order by 1, 2')
    assert.deepEqual(variants.rows, [
      { slug: 'bufanda', size: '', stock: 0 },
      { slug: 'remera', size: 'M', stock: 0 },
      { slug: 'remera', size: 'S', stock: 0 },
    ])
    const legacy = await old.query<{ status: string }>('select status from orders')
    assert.deepEqual(legacy.rows, [{ status: 'pending' }])
    // El default no cambia: el checkout anterior sigue funcionando mientras conviva.
    await old.exec("insert into orders (email, full_name, address, items, total_cents) values ('b@b.ar', 'B', 'y', '[]', 1)")
    assert.equal((await old.query<{ c: number }>("select count(*)::int as c from orders where status = 'pending'")).rows[0].c, 2)
  } finally {
    await old.close()
  }
})

test('las migraciones se aplican en orden de fecha', () => {
  const files = migrationFiles()
  assert.deepEqual(files, [...files].sort())
  assert.equal(files.at(-1), CHECKOUT)
})

test('el seed local se aplica sobre las migraciones y deja talles con y sin stock', async () => {
  const local = await migratedDb()
  try {
    await local.exec(readFileSync(join(import.meta.dirname, '..', 'supabase', 'seed.sql'), 'utf8'))
    const { rows } = await local.query<{ variants: number; sold_out: number; products_without: number }>(`
      select (select count(*)::int from product_variants) as variants,
             (select count(*)::int from product_variants where stock = 0) as sold_out,
             (select count(*)::int from products p where not exists (
                select 1 from product_variants v where v.product_id = p.id)) as products_without`)
    assert.equal(rows[0].products_without, 0)
    assert.ok(rows[0].variants > 40)
    assert.equal(rows[0].sold_out, 2)
  } finally {
    await local.close()
  }
})
