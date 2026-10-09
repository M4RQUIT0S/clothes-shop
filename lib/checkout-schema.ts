import { z } from 'zod'
import { PROVINCES, isPostalCode, normalizePostalCode } from './argentina.ts'
import { MAX_CART_LINES, MAX_ITEM_QUANTITY } from './cart.ts'
import { ADDRESS_MAX_LENGTH, EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, POSTAL_CODE_MAX_LENGTH } from './checkout-fields.ts'

export const CheckoutSchema = z.object({
  full_name: z.string().trim().min(2, 'Escribí tu nombre completo.')
    .max(NAME_MAX_LENGTH, 'El nombre es demasiado largo.'),
  email: z.string().trim().max(EMAIL_MAX_LENGTH, 'El email es demasiado largo.')
    .pipe(z.email('El email no es válido.')),
  address: z.string().trim().min(1, 'Escribí calle y número.')
    .max(ADDRESS_MAX_LENGTH, 'La dirección es demasiado larga.'),
  province: z.string().refine(
    (value) => (PROVINCES as readonly string[]).includes(value), 'Elegí una provincia de la lista.'
  ),
  postal_code: z.string().max(POSTAL_CODE_MAX_LENGTH, 'El código postal es demasiado largo.')
    .transform(normalizePostalCode)
    .refine(isPostalCode, 'El código postal no es válido: C1425DKE o 1425.'),
  items: z.array(z.object({
    slug: z.string().min(1).max(120),
    size: z.string().max(20),
    qty: z.number().int('La cantidad debe ser entera.').min(1, 'Elegí al menos una unidad.')
      .max(MAX_ITEM_QUANTITY, `El máximo es ${MAX_ITEM_QUANTITY} unidades por prenda y talle.`),
  })).min(1, 'El carrito está vacío.').max(MAX_CART_LINES, `El máximo es ${MAX_CART_LINES} líneas.`)
    .refine((items) => new Set(items.map(({ slug, size }) => JSON.stringify([slug, size]))).size === items.length,
      'Hay prendas y talles repetidos. Revisá el carrito.'),
})

export type CheckoutInput = z.infer<typeof CheckoutSchema>
