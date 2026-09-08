'use server'

import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { supabase, unitPrice, type Product } from '@/lib/shop'
import { PROVINCES, isPostalCode, normalizePostalCode } from '@/lib/argentina'

const CheckoutSchema = z.object({
  full_name: z.string().trim().min(2, 'Escribí tu nombre completo.').max(120),
  email: z.email('El email no es válido.').max(200),
  address: z.string().trim().min(10, 'La dirección parece incompleta.').max(400),
  // La lista vive en lib/argentina.ts y la comparte el desplegable del formulario:
  // una sola fuente evita ofrecer opciones que el servidor luego rechaza.
  province: z
    .string()
    .refine((v) => (PROVINCES as readonly string[]).includes(v), 'Elegí una provincia de la lista.'),
  postal_code: z
    .string()
    .transform(normalizePostalCode)
    .refine(isPostalCode, 'El código postal no es válido: C1425DKE o 1425.'),
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

function getOrderWriter() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY para registrar pedidos de forma segura.')
  }

  return createClient(url, serviceRoleKey)
}

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = CheckoutSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message }
  }

  const { full_name, email, address, province, postal_code, items } = parsed.data

  // Los precios se leen siempre de la base de datos: el cliente sólo elige qué y cuánto.
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('slug', [...new Set(items.map((i) => i.slug))])

  if (error) {
    console.error('Error leyendo precios en el checkout:', error)
    return { ok: false, error: 'No pudimos confirmar los precios. Intentá de nuevo.' }
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
      unit_price_cents: unitPrice(product),
    })
  }

  const total_cents = lines.reduce((sum, l) => sum + l.qty * l.unit_price_cents, 0)

  // getOrderWriter() lanza si la configuración del servidor está incompleta. Sin este
  // catch la excepción sale del server action, revienta el startTransition del cliente
  // y tira la página entera en vez de pintar el error del formulario.
  let orders: ReturnType<typeof getOrderWriter>
  try {
    orders = getOrderWriter()
  } catch (configError) {
    // El detalle nombra la variable de entorno que falta: se queda en el log del servidor.
    console.error('Checkout mal configurado:', configError)
    return { ok: false, error: 'No pudimos registrar el pedido. Probá de nuevo en unos minutos.' }
  }

  // El id se genera aquí: así el insert no necesita RETURNING y la tabla orders
  // puede seguir sin política de lectura para el cliente.
  const orderId = crypto.randomUUID()
  const { error: insertError } = await orders
    .from('orders')
    .insert({ id: orderId, full_name, email, address, province, postal_code, items: lines, total_cents })

  if (insertError) {
    console.error('Error creando el pedido:', insertError)
    return { ok: false, error: 'No pudimos registrar el pedido. Intentá de nuevo.' }
  }

  // ponytail: sin cobro ni descuento de stock. Aquí va Stripe cuando haga falta.
  return { ok: true, orderId }
}
