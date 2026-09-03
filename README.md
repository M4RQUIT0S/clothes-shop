# Hilo — tienda de ropa

E-commerce de ropa construido con Next.js 16 (App Router), Tailwind CSS 4 y Supabase.

## Qué hace

- Catálogo de productos servido desde Postgres, con filtro por categoría e ISR de 60 s.
- Ficha de producto con selector de talla (páginas pre-generadas con `generateStaticParams`).
- Carrito persistente en `localStorage`, sin cuentas ni login.
- Checkout que **recalcula los precios en el servidor** desde la base de datos: el cliente
  sólo dice qué y cuánto, nunca cuánto cuesta.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena con tus claves de Supabase
npm run dev
```

## Base de datos

Dos tablas, ambas con RLS activo:

| Tabla      | Política pública                                  |
|------------|---------------------------------------------------|
| `products` | lectura para `anon` y `authenticated`             |
| `orders`   | sólo inserción; nadie puede leer pedidos ajenos    |

El esquema completo está en `supabase/migrations/`.

## Tests

```bash
npm test
```

Comprueba contra el proyecto real que el catálogo es legible, que los pedidos **no** lo son
y que un pedido se puede crear sin devolver la fila.

## Fotos de producto

Las imágenes actuales son **fotos de stock de Unsplash a modo de marcador**, servidas
desde `images.unsplash.com` (licencia Unsplash: uso comercial gratuito, sin atribución
obligatoria). Cada producto guarda su URL en `products.image_url`.

Para poner las fotos definitivas basta con cambiar esa columna. Si las subes a Supabase
Storage, añade su hostname a `images.remotePatterns` en `next.config.ts`.

## Lo que no incluye

Pasarela de pago, cuentas de usuario, panel de administración y descuento de stock.
Son los siguientes pasos naturales, no descuidos: el checkout deja el hueco marcado para Stripe.

## Despliegue

Vercel construye desde `master`. Las variables de Supabase van en `.env.production`
(committeado a propósito: son públicas por diseño). Si mueves el proyecto a otra
instancia de Supabase, cambia ese fichero o define las mismas variables en
Vercel → Settings → Environment Variables, que tienen prioridad.
