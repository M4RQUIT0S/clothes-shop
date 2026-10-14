import { z } from 'zod'
import { CATEGORIES } from './shop.ts'

/**
 * Formulario de alta de prendas del panel del vendedor. Todos los campos son
 * obligatorios para que todas las prendas lleguen a la tienda con la misma
 * información; la base vuelve a exigir lo esencial (products_required_fields).
 */

/** Talles que se pueden vender, en el orden en que se muestran. Los de la guía de talles. */
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44', '46', '48'] as const

/** Formatos que acepta el bucket «prendas», con la extensión con que se guardan. */
export const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_STOCK = 9999

/** Nombre → slug de la URL pública: sin tildes ni signos, en minúsculas y con guiones. */
export const slugify = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const units = z.string().regex(/^\d{1,4}$/, `Indicá las unidades de cada talle, de 0 a ${MAX_STOCK}.`).transform(Number)

const name = z.string().trim().min(3, 'El nombre tiene que tener al menos 3 caracteres.').max(80, 'El nombre admite hasta 80 caracteres.')
  .refine((value) => slugify(value) !== '', 'El nombre tiene que tener letras o números.')
const price = z.string().regex(/^[1-9]\d{0,7}$/, 'Indicá el precio en pesos, sin centavos ni puntos.').transform((pesos) => Number(pesos) * 100)
// Ruta dentro del bucket «prendas», con el nombre que le pone el panel al subirla.
const photo = z.string().regex(/^[0-9a-f-]{36}\.(jpg|png|webp)$/, 'Subí una foto de la prenda.')

const GarmentSchema = z.object({
  name,
  description: z.string().trim().min(20, 'La descripción tiene que tener al menos 20 caracteres.').max(600, 'La descripción admite hasta 600 caracteres.'),
  price,
  category: z.string().refine((slug) => CATEGORIES.some((c) => c.slug === slug), 'Elegí una categoría.'),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Elegí el color principal de la prenda.').transform((hex) => hex.toLowerCase()),
  photo,
  stock: z.array(z.object({ size: z.string(), stock: units })).min(1, 'Elegí al menos un talle.'),
})

// Al editar, la foto es opcional: sin una nueva se conserva la actual.
const EditSchema = z.object({ name, price, photo: photo.optional() })

export type Garment = {
  slug: string; name: string; description: string; priceCents: number
  category: string; color: string; photo: string; stock: { size: string; stock: number }[]
}

type Parsed<T> = { ok: true } & T | { ok: false; error: string }

const text = (form: FormData, name: string) => String(form.get(name) ?? '')

export function parseGarment(form: FormData): Parsed<{ garment: Garment }> {
  const chosen = form.getAll('sizes')
  const parsed = GarmentSchema.safeParse({
    name: text(form, 'name'), description: text(form, 'description'), price: text(form, 'price'),
    category: text(form, 'category'), color: text(form, 'color'), photo: text(form, 'photo'),
    stock: SIZES.filter((size) => chosen.includes(size)).map((size) => ({ size, stock: text(form, `stock-${size}`) })),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const { price, ...garment } = parsed.data
  return { ok: true, garment: { ...garment, slug: slugify(garment.name), priceCents: price } }
}

export type GarmentEdit = { name: string; priceCents: number; photo?: string }

/** Nombre y precio de una prenda existente, y la foto nueva si se subió una. */
export function parseGarmentEdit(form: FormData): Parsed<{ edit: GarmentEdit }> {
  const parsed = EditSchema.safeParse({ name: text(form, 'name'), price: text(form, 'price'), photo: text(form, 'photo') || undefined })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const { price: priceCents, ...edit } = parsed.data
  return { ok: true, edit: { ...edit, priceCents } }
}

/** Unidades de cada talle que ya vende la prenda; ninguno puede quedar sin indicar. */
export function parseStock(form: FormData, sizes: string[]): Parsed<{ stock: { size: string; stock: number }[] }> {
  const parsed = z.array(units).safeParse(sizes.map((size) => text(form, `stock-${size}`)))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  return { ok: true, stock: sizes.map((size, i) => ({ size, stock: parsed.data[i] })) }
}
