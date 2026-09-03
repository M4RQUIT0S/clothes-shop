'use server'

import { z } from 'zod'
import { supabase, type Product } from '@/lib/shop'

const CheckoutSchema = z.object({
  full_name: z.string().trim().min(2, 'Escribe tu nombre completo.').max(120),
  email: z.email('El email no es válido.').max(200),
  address: z.string().trim().min(10, 'La dirección parece incompleta.').max(400),
  items: z
    .array(
      z.object({
        slug: z.string().min(1).max(120),
        size: z.string().max(20),
        qty: z.number().int().min(1).max(20),
      })
    )
    .min(1, 'El carrito está vacío.')
    .max(50),
})

export type CheckoutInput = z.infer<typeof CheckoutSchema>
export type CheckoutResult = { ok: true; orderId: string } | { ok: false; error: string }

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = CheckoutSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message }
  }

  const { full_name, email, address, items } = parsed.data

  // Los precios se leen siempre de la base de datos: el cliente sólo elige qué y cuánto.
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('slug', [...new Set(items.map((i) => i.slug))])

  if (error) {
    console.error('Error leyendo precios en el checkout:', error)
    return { ok: false, error: 'No hemos podido confirmar los precios. Inténtalo de nuevo.' }
  }

  const bySlug = new Map((data as Product[]).map((p) => [p.slug, p]))
  const lines = []

  for (const item of items) {
    const product = bySlug.get(item.slug)
    if (!product) return { ok: false, error: `"${item.slug}" ya no está disponible.` }
    lines.push({
      slug: product.slug,
      name: product.name,
      size: item.size,
      qty: item.qty,
      unit_price_cents: product.price_cents,
    })
  }

  const total_cents = lines.reduce((sum, l) => sum + l.qty * l.unit_price_cents, 0)

  // El id se genera aquí: así el insert no necesita RETURNING y la tabla orders
  // puede seguir sin política de lectura para el cliente.
  const orderId = crypto.randomUUID()
  const { error: insertError } = await supabase
    .from('orders')
    .insert({ id: orderId, full_name, email, address, items: lines, total_cents })

  if (insertError) {
    console.error('Error creando el pedido:', insertError)
    return { ok: false, error: 'No hemos podido registrar el pedido. Inténtalo de nuevo.' }
  }

  // ponytail: sin cobro ni descuento de stock. Aquí va Stripe cuando haga falta.
  return { ok: true, orderId }
}
