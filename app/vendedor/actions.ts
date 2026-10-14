'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { parseGarment, parseGarmentEdit, parseStock } from '@/lib/garment-form'
import { sizesOf } from '@/lib/shop'
import { sellerSession } from '@/lib/supabase/server'

export type SellerResult = { ok: true; message: string } | { ok: false; error: string }

const DENIED: SellerResult = { ok: false, error: 'Tu sesión no tiene acceso al panel. Volvé a iniciar sesión con la cuenta de vendedor.' }
const FAILED: SellerResult = { ok: false, error: 'No pudimos guardar el cambio. Probá de nuevo.' }
const GONE: SellerResult = { ok: false, error: 'Esa prenda ya no está en la tienda.' }
const productId = (form: FormData) => z.uuid().safeParse(form.get('id'))
type Db = Extract<Awaited<ReturnType<typeof sellerSession>>, { ok: true }>['db']
const photoUrl = (db: Db, path: string) => db.storage.from('prendas').getPublicUrl(path).data.publicUrl

/** Alta de una prenda con todos sus campos y su stock por talle. La foto ya está subida al bucket. */
export async function createGarment(form: FormData): Promise<SellerResult> {
  const parsed = parseGarment(form)
  if (!parsed.ok) return parsed
  const session = await sellerSession()
  if (!session.ok) return DENIED
  const g = parsed.garment
  const { error } = await session.db.rpc('create_product', {
    p_slug: g.slug, p_name: g.name, p_description: g.description, p_price_cents: g.priceCents,
    p_image_url: photoUrl(session.db, g.photo),
    p_category: g.category, p_color: g.color, p_stock: g.stock,
  })
  if (error?.code === '23505') return { ok: false, error: 'Ya hay una prenda con ese nombre. Usá otro.' }
  if (error) {
    console.error('Error dando de alta la prenda:', error)
    return FAILED
  }
  revalidatePath('/', 'layout')
  return { ok: true, message: `«${g.name}» ya está en la tienda.` }
}

/**
 * Nombre, precio y, si se subió una nueva, foto de una prenda existente. El slug no
 * cambia: es la URL pública y lo que identifica la prenda en carritos y pedidos.
 */
export async function updateGarment(form: FormData): Promise<SellerResult> {
  const id = productId(form)
  if (!id.success) return FAILED
  const parsed = parseGarmentEdit(form)
  if (!parsed.ok) return parsed
  const session = await sellerSession()
  if (!session.ok) return DENIED
  const { name, priceCents, photo } = parsed.edit
  const { data, error } = await session.db
    .from('products')
    .update({ name, price_cents: priceCents, ...(photo && { image_url: photoUrl(session.db, photo) }) })
    .eq('id', id.data)
    .select('id')
  if (error?.message.includes('products_sale_price_check')) {
    return { ok: false, error: 'La prenda tiene una rebaja vigente: el precio tiene que quedar por encima del precio rebajado.' }
  }
  if (error) {
    console.error('Error editando la prenda:', error)
    return FAILED
  }
  if (!data.length) return GONE
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Cambios guardados.' }
}

/** Unidades de cada talle de una prenda existente. */
export async function updateStock(form: FormData): Promise<SellerResult> {
  const id = productId(form)
  if (!id.success) return FAILED
  const session = await sellerSession()
  if (!session.ok) return DENIED
  const { data: product, error: readError } = await session.db.from('products').select('sizes').eq('id', id.data).maybeSingle()
  if (readError) {
    console.error('Error leyendo la prenda:', readError)
    return FAILED
  }
  if (!product) return GONE
  const stock = parseStock(form, sizesOf(product))
  if (!stock.ok) return stock
  const { error } = await session.db.from('product_variants').upsert(stock.stock.map((row) => ({ product_id: id.data, ...row })))
  if (error) {
    console.error('Error guardando el stock:', error)
    return FAILED
  }
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Stock guardado.' }
}

/** Quita la prenda de la tienda junto con su stock. Los pedidos ya hechos no cambian. */
export async function deleteGarment(form: FormData): Promise<SellerResult> {
  const id = productId(form)
  if (!id.success) return FAILED
  const session = await sellerSession()
  if (!session.ok) return DENIED
  const { data, error } = await session.db.from('products').delete().eq('id', id.data).select('id')
  if (error) {
    console.error('Error eliminando la prenda:', error)
    return FAILED
  }
  if (!data.length) return GONE
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Prenda eliminada.' }
}
