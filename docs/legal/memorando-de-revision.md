# Memorando sobre las políticas de privacidad y cookies de Hilo

Para: responsable de ClothesShop

Fecha: 10 de octubre de 2026

Asunto: alcance de los borradores y datos necesarios para su publicación

## Cuestión

Redactar las políticas de la tienda según su funcionamiento comprobable, sin atribuirle una identidad legal, controles de consentimiento o contratos que no estén acreditados.

## Respuesta breve

Actualización de publicación — 10 de octubre de 2026: los borradores están disponibles en `https://clothes-shop-wheat.vercel.app/privacidad` y `/cookies`, con los campos Pendiente y noindex conservados. El usuario pidió añadir «Aceptar cookies» y desplegar, y luego aprobó el SQL completo con «Aplicar migraciones y desplegar». El aviso registra localmente versión y fecha, considera vigente la elección durante 180 días y permite restablecerla desde cookies, sin borrar carrito ni sesión. No habilita analítica ni publicidad; Cerrar sigue siendo temporal. Esta actualización reemplaza las referencias siguientes a publicación pendiente y ausencia de persistencia del aviso, que describen la revisión inicial.

Checkout y carritos ya tienen su esquema en producción y se verificaron acceso/sincronización con dos cuentas desechables eliminadas al terminar, sin pedidos, pagos ni correos. Faltan stock real, credenciales de cobro/recibo/correo y SMTP propio para confirmación de nuevas cuentas públicas. Se preservaron ocho pedidos y se configuró el retorno de Auth al dominio publicado. Verificación y límites en `docs/deploy-2026-10-10.md`.

Se prepararon dos borradores editables en Markdown: `politica-de-privacidad.md` y `politica-de-cookies.md`. El marco argentino es una hipótesis sustentada en el checkout con provincias argentinas, moneda ARS y Mercado Pago; falta confirmación del responsable. Posteriormente el usuario autorizó incorporarlos a la web con los datos faltantes marcados como pendientes. Están en las rutas locales `/privacidad` y `/cookies`, con aviso informativo, enlaces permanentes en el pie y enlaces en el checkout. No se realizó un despliegue de estos cambios.

Faltan nombre o razón social, CUIT, domicilio, correo de privacidad y dominio definitivo. También deben confirmarse logística, retención y destinos y garantías de las transferencias internacionales. Por indicación del usuario los campos pendientes se muestran expresamente en los borradores consultables. No se presentan como versiones definitivas ni como verificación integral de cumplimiento; las páginas tienen `noindex` mientras sigan en este estado.

## Hechos relevantes

Actualización posterior — carrito y cuentas, 10 de octubre de 2026: se añadió `/cuenta`, Supabase Auth por correo y contraseña y carrito sincronizado por usuario. Los visitantes siguen con carrito local. La caché y las operaciones pendientes de cuentas tienen claves separadas en localStorage; los pedidos nuevos con sesión incorporan el identificador del usuario verificado. Las dos políticas, sus páginas y el aviso se actualizaron para reflejarlo. Se probó registro/acceso con usuarios temporales en Supabase local, sin pagos ni correos de pedido reales; esos usuarios se eliminaron. SQL, configuración de Auth y despliegue de producción siguen pendientes. La arquitectura y sus verificaciones están en `docs/decisions/001-carrito-y-cuentas.md`. La referencia a `lib/cart-store.ts` de la revisión inicial queda reemplazada por `lib/synced-cart.ts` en la aplicación.

La revisión se realizó sobre el árbol local, que tiene modificaciones previas y archivos sin seguimiento. No acredita que todas las funciones estén desplegadas o configuradas en producción. No se leyeron credenciales ni se realizaron pedidos, pagos o envíos de correo.

| Fuente local | Hallazgo utilizado |
|---|---|
| `app/layout.tsx`, `components/site-footer.tsx` | Marca Hilo; no hay componentes activos de Analytics o Speed Insights en el layout. |
| `lib/checkout-schema.ts` | Nombre, email, domicilio, provincia, código postal y líneas del pedido. |
| `lib/checkout/place-order.ts`, `lib/checkout/supabase-store.ts` | Persistencia de pedidos, importes, referencias y estados. |
| `lib/mercadopago.ts` | Correo, ítems, importes, referencia y enlaces de retorno transmitidos al proveedor de pagos. |
| `lib/resend.ts`, `lib/checkout/order-email.ts`, `lib/checkout/server-config.ts` | Correo de confirmación opcional según configuración, con nombre, detalle, importes y enlace al recibo. |
| `components/cart.tsx`, `lib/cart-store.ts` | Registro local del carrito sin TTL programado. |
| `lib/pending-order.ts`, `app/carrito/page.tsx`, `components/receipt-cart.tsx` | Registro local del pedido pendiente, incluida una ruta de acceso privada; se elimina al procesar un pedido confirmado. |
| `lib/checkout/receipt-token.ts` | Enlace firmado al recibo sin vencimiento temporal incorporado en el token. |
| `components/product-image.tsx`, `next.config.ts` | Imágenes remotas de Unsplash a través de Next Image; no basta la URL fuente para atribuir una conexión directa del comprador a Unsplash. Verificar red en producción. |

## Análisis

La [Ley 25.326](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion) exige informar finalidades, destinatarios y responsable al recolectar datos. Por eso, completar la identidad y el contacto es necesario antes de publicar el aviso y utilizarlo en el checkout.

El texto distingue datos necesarios para una compra de usos opcionales. No se añadió una aceptación general de publicidad ni un banner que simule controles inexistentes. La necesidad y diseño de consentimiento deben reevaluarse si se habilitan herramientas adicionales.

La [AAIP explica los derechos y sus plazos](https://www.argentina.gob.ar/aaip/datospersonales/derechos). El responsable necesita un canal real y un procedimiento para atenderlos; redactar una cláusula no implementa ese procedimiento.

Los [criterios de la AAIP sobre transferencias internacionales](https://www.argentina.gob.ar/transferencias-internacionales) requieren verificar destinos y mecanismos aplicables. No se confirmó la región de la base, las ubicaciones de procesamiento, la contratación de garantías ni la retención de los proveedores. Los avisos generales de privacidad no prueban por sí solos esas condiciones del proyecto.

El código revisado no establece un calendario completo de eliminación de pedidos. Por eso se dejaron plazos por completar, sin prometer un borrado automático inexistente. La cancelación de un pedido o vencimiento de un pago no equivale a eliminar sus datos.

## Pasos para cerrar los textos

1. Completar la identidad del responsable, país, dominio y canal de privacidad.
2. Confirmar proveedores activos, modalidad de entrega, retención y transferencias con la configuración y contratos efectivos.
3. Verificar en el despliegue real el almacenamiento, cookies y solicitudes de catálogo, carrito y vuelta del pago. Revisar si hay cookies de infraestructura o scripts inyectados fuera del código local.
4. Revisar las obligaciones de registro de la base de datos que correspondan al responsable. No se verificó una inscripción.
5. Completar los campos en las páginas `app/privacidad/page.tsx` y `app/cookies/page.tsx` y sincronizar los Markdown de esta carpeta. Al cerrar la revisión, retirar los avisos de borrador y `noindex`, y fijar la fecha de vigencia. El aviso de privacidad ya queda accesible antes del envío de datos. Cerrar el cartel sólo lo oculta durante la navegación actual: no registra consentimiento ni añade almacenamiento persistente.

## Estado de la plantilla solicitada

La integración web pasó ESLint y TypeScript. Se verificaron las rutas legales y el aviso en Chrome aislado, con anchos de 320, 360, 768, 1024 y 1440 px, incluyendo navegación, cierre con teclado, marcas de pendiente, noindex y ausencia de desbordamiento horizontal de la página. Las tablas admiten desplazamiento horizontal en pantallas estrechas. No se enviaron pedidos ni se ejecutaron pagos o correos.

Se leyeron la skill Legal Memorandum, `artifact-template.json` y el flujo de documentos. La referencia DOCX se conservó intacta. El render obligatorio falló con `FileNotFoundError: LibreOffice soffice.exe was not found on PATH`; tampoco se encontró en las dos ubicaciones estándar de Windows comprobadas.

No se creó un DOCX que incumpliera la verificación visual ni se instalaron herramientas. Este memorando conserva la organización semántica de cuestión, respuesta, hechos y análisis; **no reproduce la maquetación de la plantilla**. Los dos Markdown son la redacción alternativa disponible, pendiente de maquetar si se habilita el render.
