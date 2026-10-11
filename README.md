# Hilo — tienda de ropa

Tienda con Next.js 16 (App Router), Tailwind CSS 4 y Supabase. Página publicada: https://clothes-shop-wheat.vercel.app.

## Qué hace

- Catálogo de productos servido desde Postgres, con filtro por categoría e ISR de 60 s.
- Ficha de producto con selector de talla (páginas pre-generadas con `generateStaticParams`).
- Carrito local para visitantes; registro/acceso Supabase Auth en `/cuenta`, carrito persistido por cuenta y sincronización entre dispositivos. Al entrar se conserva la mayor cantidad por prenda/talle, sin sumar duplicados.
- Checkout que **recalcula los precios en el servidor** desde la base de datos: el cliente
  sólo dice qué y cuánto, nunca cuánto cuesta. Valida talles y stock, exige aceptar cambios de importe y conserva el pedido al reintentar.
- Mercado Pago Checkout Pro mediante la API de Órdenes, webhook firmado, stock por talle descontado al confirmar, recibo privado y correo opcional por Resend.
- Borradores de privacidad, cookies y términos y condiciones con datos Pendiente, accesibles desde el pie y el checkout. Aviso Aceptar cookies con elección local vigente durante 180 días y restablecimiento en `/cookies`.

## Puesta en marcha

```powershell
npm ci
Copy-Item .env.example .env.local
# Completar las variables públicas y las credenciales de servidor necesarias.
npm run dev
```

Para integración local, iniciar Supabase con Docker y configurar `.env.development.local` con la URL y claves de esa instancia. Next usa esa configuración en desarrollo; no resetear una instancia con datos que se necesiten conservar.

## Base de datos

El esquema completo está en `supabase/migrations/`. Permisos mediante RLS:

| Tabla      | Política pública                                  |
|------------|---------------------------------------------------|
| `products`, `product_variants`, `news` | lectura pública |
| `orders`, `cart_operations` | tablas internas, sin acceso directo del comprador |
| `account_carts` | lectura de la cuenta propietaria; escrituras mediante RPC autenticada |

Las tres migraciones de checkout/cuentas fueron aprobadas y aplicadas en producción el 10 de octubre de 2026: ocho pedidos preservados y 60 variantes con **stock cero**. Los pedidos se conservan al vaciar carritos o eliminar cuentas. Nuevas migraciones de producción y merges requieren revisar y aprobar el SQL exacto, según la decisión del proyecto.

## Tests

```powershell
npm test                 # Unitarias y SQL en memoria; sin escribir en Supabase remoto.
npm run test:integration # Sólo Supabase local; incluye escrituras que deben rechazarse.
npm run lint
npx tsc --noEmit
npm run build
```

La integración requiere `.env.development.local` y rechaza URLs externas antes de hacer peticiones. Ver evidencia y límites en el [ADR de carritos](docs/decisions/001-carrito-y-cuentas.md) y el [registro de despliegue](docs/deploy-2026-10-10.md).

## Fotos de producto

Las imágenes actuales son **fotos de stock de Unsplash a modo de marcador**, servidas
desde `images.unsplash.com` (licencia Unsplash: uso comercial gratuito, sin atribución
obligatoria). Cada producto guarda su URL en `products.image_url`.

Para poner las fotos definitivas basta con cambiar esa columna. Si las subes a Supabase
Storage, añade su hostname a `images.remotePatterns` en `next.config.ts`.

## Configuración y pendientes

En Vercel están configurados Supabase, `SITE_URL` y `RECEIPT_SECRET`. Para habilitar compras faltan `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y stock real por talle. Para correo de pedidos se requieren `RESEND_API_KEY` y `RESEND_FROM`; para confirmar cuentas públicas, SMTP propio en Supabase Auth. La confirmación de correo sigue activada. No se hicieron pagos ni correos reales en la verificación del despliegue.

Completar también medidas reales e identidad, contacto, retención y otros campos legales marcados Pendiente. Las políticas son borradores con noindex; las fotos y las medidas de referencia siguen siendo marcadores. No hay panel de administración ni historial de pedidos por cuenta.

## Despliegue

Vercel tiene integración con `master`; el despliegue del 10 de octubre se realizó por CLI de `fix/checkout-revision-2026-10-09`. Un push a esa rama no equivale a mergear a `master`.

Las credenciales privadas se guardan en archivos `.local` ignorados o variables Secret de Vercel, sin prefijo `NEXT_PUBLIC_`. `.env.production` contiene sólo configuración pública. No subir claves de servicio, Mercado Pago, Resend ni el secreto de recibos al repositorio.
