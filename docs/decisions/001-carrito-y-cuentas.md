# ADR-001: carrito local y sincronización por cuenta

Estado: publicado y verificado en producción; registro público pendiente de SMTP.

Fecha: 10 de octubre de 2026. Proyecto: ClothesShop / Hilo.

## Decisión

El visitante mantiene su carrito en `clothes-shop-cart`, dentro de localStorage. La compra sin cuenta sigue disponible. Añadimos registro y acceso por correo y contraseña con Supabase Auth en `/cuenta` porque el proyecto todavía no tenía una sesión de usuario.

Al entrar, el servidor pasa a ser el registro principal del carrito. Se importan las prendas del visitante: cuando producto y talle coinciden, se conserva la **mayor cantidad**, sin sumar. Así, entrar otra vez o recuperar una respuesta perdida no duplica unidades. Las prendas importadas se retiran del carrito visitante sólo después de confirmar la operación. El límite sigue siendo 50 líneas y 20 unidades por línea; los excedentes de una importación permanecen como visitante y se avisa.

Cada modificación tiene UUID y se aplica con una RPC atómica. El bloqueo por usuario conserva cambios de otras prendas hechos desde otro dispositivo. Para cantidades de la misma línea prevalece la última operación aplicada en el servidor. Se prefirieron operaciones sobre líneas frente a reemplazar todo el carrito, que perdería cambios de otros dispositivos. Se conservan recibos de operaciones para reconocer reintentos.

Una caché y un diario local separados por usuario permiten trabajar durante fallos de red y recargar sin perder operaciones ya guardadas. La sincronización se reintenta al recuperar conexión, volver a la pestaña, pulsar Reintentar y cada 15 segundos mientras está visible. Es sincronización eventual, sin suscripción Realtime. Cerrar sesión vuelve al carrito visitante; no importa productos de otra cuenta ni borra el carrito del servidor. La caché de la cuenta permanece en el dispositivo, como explica la política.

Desde la corrección del 12 de octubre, los resultados remotos se publican después de resolver todas las operaciones pendientes. Hasta entonces se conserva la base local y se superpone el diario una sola vez. Antes de retirar las operaciones se guarda, en una única escritura de caché, el carrito confirmado junto con sus UUID incluidos. Si falla guardar o borrar, los reintentos y recargas conservan esa relación y no vuelven a sumar cantidades. Cada pestaña incorpora la caché compartida antes de modificarla; si cambia mientras una lectura remota está en vuelo, se repite la lectura para evitar reemplazarla con un resultado anterior.

Los rechazos definitivos de validación de la RPC (`22023`, incluido el límite de líneas) se retiran del diario con un aviso y permiten continuar con las operaciones siguientes. Los fallos de red o de consulta del catálogo posteriores al commit conservan el UUID para reintentar. El visitante lee el carrito persistido antes de cada cambio y las cotizaciones sólo actualizan precios de las líneas presentes, preservando las prendas agregadas desde otra pestaña.

## Límites de confianza

`account_carts` sólo admite lectura propia mediante RLS. No hay escrituras directas de clientes. `mutate_account_cart` verifica `auth.uid()`, valida referencias y cantidades y delega en una función con privilegios elevados dentro del esquema privado. El cliente no elige el propietario ni envía importes para cobrar. El checkout vuelve a cotizar catálogo, talles, stock y precios en el servidor.

El SDK de Auth administra la sesión compartida entre navegador y servidor. Sus cookies usan SameSite=Lax, Secure en producción y siete días renovables; los adaptadores `setAll` ajustan la duración porque `@supabase/ssr` sobrescribe `cookieOptions.maxAge` con su valor de 400 días. Se conserva maxAge=0 para borrar cookies. Son accesibles al SDK del navegador, según el patrón de Supabase SSR; no son cookies HttpOnly. No guardamos contraseñas ni tokens en la caché del carrito. Las peticiones de carrito capturan el token de la cuenta comprobada para que un cambio de sesión no redirija una operación en vuelo a otra cuenta. Sólo se instancia un cliente de Auth en el navegador; los clientes de datos usan `accessToken`.

## Pedidos

Los pedidos se registran en `orders` desde el servidor antes de abrir el pago, también para visitantes. Los nuevos pedidos con sesión incorporan `user_id` a partir de las claims verificadas; la entrada del formulario no puede asignarlo. Cambiar de cuenta impide reutilizar un intento de compra de otra cuenta. Los pedidos invitados anteriores conservan su huella idempotente.

Vaciar el carrito, salir o eliminar una cuenta no borra pedidos. La relación de pedidos con Auth usa `ON DELETE SET NULL`; el carrito y su diario de operaciones del servidor sí se eliminan al borrar la cuenta. No se agregó una interfaz de eliminación de cuentas ni un historial de pedidos. El recibo privado existente sigue disponible; sólo consume el carrito original cuando el pedido queda confirmado y las cantidades siguen coincidiendo.

## SQL exacto y configuración de producción

Estas migraciones se crearon con Supabase CLI, se probaron localmente y, tras aprobar el usuario los archivos completos junto con checkout, se aplicaron a producción el 10 de octubre de 2026, sin resetear datos:

1. [20261010060817_account_carts.sql](../../supabase/migrations/20261010060817_account_carts.sql): tablas, RLS, RPC, permisos y propietario opcional en pedidos.
2. [20261010061945_cart_merge_capacity.sql](../../supabase/migrations/20261010061945_cart_merge_capacity.sql): conserva excedentes de la importación sin bloquear siguientes operaciones.

La aprobación fue «Aplicar migraciones y desplegar». También se aplicó `20261009150000_checkout_payments.sql`; se conservaron los ocho pedidos y las 60 variantes arrancaron en cero. El build remoto pasó y se publicó `dpl_8pCcmcJMi8tMapxtXMrkLasYiN3h`. No se hizo merge, push ni commit. Detalles en [registro de publicación](../deploy-2026-10-10.md).

Supabase Auth usa Site URL `https://clothes-shop-wheat.vercel.app` y el retorno exacto `/auth/callback` de ese origen, sin comodines. SMTP propio sigue deshabilitado: el registro público con confirmación necesita configurarlo; no se debilitó la confirmación. Los pagos y correos de pedido siguen dependiendo de las credenciales pendientes de la tarea anterior. Las cuentas desechables de QA de producción se eliminaron junto con sus carritos, sin correos, pagos ni alteración de pedidos.

Definir retención de cuentas inactivas y recibos de operaciones antes del lanzamiento. No borrar recibos de idempotencia sin coordinar el horizonte de reintentos de los clientes. Las políticas web y sus Markdown dejan estos plazos como **Pendiente**.

## Verificación

Corrección del 12 de octubre de 2026: 126 pruebas unitarias/SQL aprobadas, incluidas 13 regresiones nuevas de respuestas perdidas, rechazo de capacidad con las migraciones reales en PGlite, pestañas con caché anterior, cotizaciones, lecturas en vuelo y fallos al guardar/eliminar. Cobertura de `account-cart.ts` y `synced-cart.ts`: 99,34 % de líneas, 91,30 % de ramas y 98,04 % de funciones. Chrome aislado comprobó el módulo real con localStorage compartido entre dos pestañas y respuestas remotas simuladas, sin errores de ejecución. ESLint, TypeScript y build optimizado con configuración de Supabase local aprobados. Esta verificación no utiliza cuentas ni datos de producción.

Verificación original de publicación:

- 111 pruebas unitarias/SQL pasan; cubren RLS, entradas malformadas, fusión, capacidad, reintentos tras respuesta perdida, recarga sin conexión, cambio de cuenta y permanencia de pedidos.
- Cobertura del núcleo nuevo `account-cart.ts` y `synced-cart.ts`: 96,52% de líneas, 84,62% de ramas, 87,18% de funciones.
- ESLint, TypeScript y build optimizado usando exclusivamente Supabase local. Para mantener las variables locales también en los workers de Next, cargar `.env.development.local` en un proceso padre y lanzar `node node_modules/next/dist/bin/next build` como proceso hijo; no pasar `--env-file` al proceso de Next, que lo copia a NODE_OPTIONS de sus workers.
- Chrome aislado con dos contextos (1440 y 360 px): registro real local, importación de carrito, inicio de sesión en segundo navegador, actualización de cantidades entre ambos, bloqueo/reintento de red y salida sin borrar datos remotos. Comprobación de siete días de cookies y su eliminación al salir; sin errores de ejecución ni avisos de múltiples clientes Auth. Capturas inspeccionadas.
- No se hicieron pagos ni envíos de correo de pedido reales.

## Auditoría de dependencias

Actualización al publicar, 10 de octubre: Next/eslint-config-next 16.3.8, sharp 0.35.5 y source-map-js 1.2.2; actualizaciones compatibles de brace-expansion. Auditoría de producción (`--omit=dev`) sin vulnerabilidades conocidas. Permanecen cinco avisos altos de glob en la cadena de ESLint; no se forzó el downgrade a Next 14. Build remoto, 113 pruebas, lint, tipos y pruebas de navegador público aprobados. El análisis inicial siguiente se conserva como registro histórico.

La adición fijada de `@supabase/ssr@0.12.7` incorpora únicamente ese paquete y `cookie`; se instaló sin scripts y se revisó el diff del lockfile. `npm audit` informa nueve hallazgos en dependencias ya existentes (ocho altos y uno crítico), ninguno en la nueva dependencia. No se ejecutó `audit fix --force`.

El [crítico de Next ImageResponse](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) requiere SVG con datos controlados por un atacante en `next/og`; no hay ese código en esta app. El [aviso sobre imágenes](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) requiere una URL permitida cuyo host/DNS controle el atacante; sólo se permite `https://images.unsplash.com`, sin URLs arbitrarias aportadas por compradores. El [envenenamiento con catch-all](https://github.com/vercel/next.js/security/advisories/GHSA-mcj8-r9mp-w47p) exige una ruta catch-all en la raíz, que la app no tiene. Esta revisión acotada no sustituye actualizar y comprobar Next, sharp y las dependencias de desarrollo antes de publicar. Seguimiento separado, revisión prevista: 17 de octubre de 2026 o antes del próximo despliegue.
