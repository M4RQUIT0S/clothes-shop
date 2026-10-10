# Carrito de visitantes y cuentas

Solicitud: carrito local para visitantes, sincronizado en el servidor al iniciar sesión, pedidos siempre persistidos en el servidor.

1. Añadir acceso y registro por correo y contraseña con Supabase Auth y sesiones verificadas. Mantener compra sin cuenta.
2. Crear carrito por usuario con RLS. Guardar sólo referencias, talles y cantidades; precios siempre del catálogo. Operaciones atómicas e idempotentes para reintentos y cambios desde varios dispositivos.
3. Fusionar el carrito del visitante al entrar. Para una prenda/talle presente en ambos, conservar la mayor cantidad (sin duplicar por reingresos); nunca reemplazar todo el carrito del servidor con una copia local antigua.
4. Mantener una caché y operaciones pendientes separadas por cuenta. Al cerrar sesión volver al carrito visitante, sin mostrar productos de la cuenta anterior. Actualizar al volver a la pestaña, recuperar conexión y periódicamente.
5. Asociar pedidos nuevos al usuario verificado si inició sesión. Los pedidos invitados siguen guardados en servidor y se consultan por recibo privado.
6. Probar merge, reintentos, desconexión, cambios concurrentes, aislamiento/RLS y pedidos. Probar registro/acceso y dos navegadores contra Supabase local.
7. Actualizar políticas y documentar SQL de producción. El proyecto requiere aprobación con SQL exacto antes de aplicar nuevas migraciones remotas o mergear.

Estado al 10 de octubre de 2026: pasos 1–7 implementados y publicados. El usuario aprobó el SQL completo con «Aplicar migraciones y desplegar»; las tres migraciones de checkout/cuentas están aplicadas y se preservaron ocho pedidos. 113 pruebas unitarias/SQL, lint, TypeScript, build remoto y Chrome público con dos contextos verificados. Aviso Aceptar cookies, vigencia y restablecimiento también comprobados. Arquitectura y evidencia en `docs/decisions/001-carrito-y-cuentas.md` y `docs/deploy-2026-10-10.md`.

Pendientes externos: SMTP propio para alta pública con confirmación; credenciales de Mercado Pago y Resend, stock/medidas reales y campos legales. SITE_URL y RECEIPT_SECRET de producción ya están configurados. No se deshabilitó confirmación ni se inventaron existencias. El usuario autorizó commit y push de todos los cambios en la rama actual; no solicitó merge a master.
