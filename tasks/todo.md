# Correcciones de la auditoría UX

## Cierre actualizado — 11 de octubre de 2026

- [x] Checkout idempotente, cotización/aceptación de cambios de importe, recuperación de fallo de transporte y recibo privado implementados y probados; reemplazan la demo descrita en el registro inicial.
- [x] Pedidos persistidos en servidor y stock por talle con confirmación atómica.
- [x] Carrito local de visitantes, cuentas con RLS, fusión sin duplicar, sincronización/reintentos y aislamiento al salir o cambiar de cuenta.
- [x] Políticas publicadas con campos Pendiente; aviso Aceptar cookies y restablecimiento.
- [x] Términos y condiciones publicados en `/terminos`, con campos Pendiente y enlaces desde el pie y el checkout; verificados en móvil y escritorio.
- [x] SQL completo aprobado y aplicado en producción, ocho pedidos preservados; despliegue y navegador público verificados.
- [x] Revisión directa de corrección, concurrencia, seguridad, límites de permisos, dependencias y documentación; no se delegó a subagentes.
- [x] 113 pruebas unitarias/SQL y seis de integración local; lint, tipos, build remoto y navegador de dos cuentas.
- [x] SITE_URL y RECEIPT_SECRET añadidos a producción; Secret generado sin guardarlo en Git ni mostrarlo.
- [ ] Credenciales MP y prueba de pago real en sandbox; remitente/clave Resend y SMTP de confirmación de cuentas.
- [ ] Stock real por talle (hoy cero), medidas propias y datos legales: los aporta el responsable.

El usuario pidió commit y push de todo en la rama actual. No implica autorización de merge a master. Evidencia vigente y límites: `docs/deploy-2026-10-10.md`. Los apartados siguientes son el registro histórico de los incrementos anteriores; sus casillas reflejan el estado de esas fechas.

## Registro inicial — 5 de octubre de 2026

## T1 — Áreas táctiles y etiquetas locales

- [x] Agregar, talles, quitar y enlaces de navegación tienen área táctil suficiente.
- [x] La ficha muestra Remeras/Buzos/Camperas según las etiquetas compartidas.
- Verificación: diff, lint, tipos y cajas finales en navegador.
- Dependencias: ninguna. Archivos: quick-add, add-to-cart, carrito/page, producto/page y estilos.

## T2 — Cantidades válidas sin pérdida de contenido

- [x] Editar 1 → 2 no elimina prenda ni formulario.
- [x] Cantidades enteras 1–20; añadir en el límite informa el rechazo.
- [x] Datos persistidos inválidos no rompen el carrito.
- [x] Fallos de lectura/escritura del almacenamiento conservan cambios en memoria con aviso.
- Verificación: pruebas de carrito y navegador.
- Dependencias: D3. Archivos: cart, módulo de lógica, prueba de carrito, controles.

## T3 — Pedido y carrito concurrente

- [x] Durante envío se bloquean edición y eliminación locales (código; envío real pendiente).
- [ ] Confirmación conserva adiciones posteriores y trata cambios incompatibles de forma explícita.
- [ ] Reintentos de una petición no generan pedidos duplicados.
- Verificación: pruebas con instantáneas diferentes, errores de transporte y doble envío.
- Dependencias: T2, D4. Archivos: cart, lógica de carrito, acciones, contrato y tests.

## T4 — Importes aceptados y recibo

- [ ] Cambio de precio/envío exige aceptar el resumen actualizado antes del registro.
- [ ] Confirmación muestra referencia completa e importes calculados en servidor.
- [ ] Recibo puede recuperarse al recargar según persistencia acordada.
- Verificación: precio cambiado, umbral de envío, recarga y almacenamiento no disponible.
- Dependencias: T3, D1, D4. Archivos: acciones, contrato, confirmación, tests y página de carrito.

## T5 — Formulario robusto

- [x] Dirección corta razonable, email con espacios y ambos CP aceptados; inválidos rechazados.
- [x] Límites y ayudas cliente/servidor alineados, errores útiles.
- [ ] Excepción de transporte conserva información y permite recuperación segura.
- Verificación: pruebas de validación y formulario en navegador.
- Dependencias: T3 para reintentos. Archivos: esquema, acciones, campos, tests.

## T6 — Elección y feedback accesibles

- [x] Varios talles requieren elección; una única variante puede preseleccionarse.
- [x] Añadido rápido anuncia resultado y devuelve foco al disparador.
- [x] Contraste/tipografía legibles sin desbordamiento en los tamaños comprobados.
- Verificación: teclado, móvil y contrastes. Dependencias: T2, D2.
- Archivos: add-to-cart, quick-add, estilos, product-card.

## T7 — Catálogo y ficha

- [x] Enlaces de categorías llevan a resultados y anuncian categoría activa.
- [x] Ficha sitúa datos de compra según D2.
- [x] Vista filtrada y cabecera coinciden; newsletter retirada según D2.
- Verificación: navegación desde home/producto/pie/móvil; 360, 768 y escritorio.
- Dependencias: D2. Dividir en navegación, ficha y portada/pie, con comprobación entre cambios.

## T8 — Carga y recuperación

- [x] Navegación y filtros pendientes tienen feedback; siluetas coherentes (carga observada; filtro lento no simulado).
- [ ] Catálogo vacío/error permite recuperar; producto inexistente vuelve al catálogo.
- [ ] Menús y controles funcionan con teclado y movimiento reducido.
- Verificación: datos lentos/ausentes, error simulado local y navegador.
- Dependencias: T7. Archivos: loading/error/not-found, fallback y enlaces.

## T9 — Cierre

- [x] Suite local, lint, tipos y build aprobados para este incremento.
- [ ] Navegador: flujo completo y tamaños; registrar límites de lo que no se pudo probar.
- [ ] Revisión de diff, cobertura de hallazgos y memoria actualizada.
- Dependencias: T1–T8. No marcar completado ningún hallazgo sin evidencia.

## Estado al retomar

Ver `docs/ux-implementation-2026-10-05.md` para evidencia y límites de las pruebas. T3–T4, recuperación del envío y cierre del checkout siguen pendientes. El checkout todavía registra una demo; no hay pasarela ni correo configurados. No desplegar como compra real.

---

# Revisión del 2026-10-09 — checkout real

Plan en `tasks/plan.md` (sección del 2026-10-09). Rama `fix/checkout-revision-2026-10-09`, sin mergear.

## R1 — Guía de talles (P1 nuevo)
- [x] Procedencia explícita: tabla de categoría nunca cuenta como medida de la prenda; la ficha dice «orientativa» (`517a4c9`).
- [ ] Medidas reales por prenda: las aporta el usuario; al cargarlas se marcan `verified: true`.

## R2 — Variantes y stock en servidor (P1)
- [x] Cotización y pedido rechazan talle inexistente, agotado o con unidades insuficientes, por línea, sin insertar.
- [x] Stock por talle (`product_variants`) y descuento atómico al aprobarse el pago; sin stock o importe distinto → revisión sin descuentos parciales (pruebas PGlite).
- [ ] Cantidades reales por talle en producción: las aporta el usuario; la migración ya fue aprobada y aplicada con stock cero.

## R3 — Pedido idempotente y recuperable (P1)
- [x] Clave por intento; reenviar devuelve el mismo pedido y enlace de pago; otro contenido con la misma clave se rechaza; carrera → un solo pedido.
- [x] Corte de red o fallo de pasarela: formulario bloqueado, reintento con la misma clave (probado en navegador local: un solo pedido tras reintentar).
- [x] Carrito entre pestañas: al volver con el pedido en firme se quita sólo lo pedido tal cual (probado en navegador local).

## R4 — Importes aceptados (P2/P1 antes de cobrar)
- [x] Cotización con huella; QUOTE_CHANGED sin insertar y aceptación explícita del total nuevo (probado en navegador local).

## R5 — Pago, correo y recibo (P2)
- [x] Mercado Pago Checkout Pro por la API de Órdenes; webhook firmado que relee la orden.
- [x] Recibo privado `/pedido/<id>?t=<token>` con referencia completa, importes del servidor y estado real de pago y correo.
- [x] Correo de pago recibido una sola vez (Resend), sin prometerlo si no está configurado.
- [ ] Flujo real en el entorno de prueba de Mercado Pago: faltan credenciales de prueba; la URL https ya está publicada.
- [ ] Remitente de correo: falta dominio verificado en Resend.

## R6 — Enlaces de recuperación (checklist 8)
- [x] Carrito vacío y recibo: `/#catalogo` con 44 px (`517a4c9`).

## Verificación
- [x] 94 pruebas unitarias (incluye migración y función de pago contra Postgres en memoria), lint, tipos y build de producción.
- [x] Navegador local con Supabase en Docker: ficha, carrito, cambio de total, fallo de pasarela, recibo, 404 con token alterado, pago aprobado, webhook; 360 px sin desbordes.
- [ ] Revisión adversarial multi-ángulo y correcciones confirmadas.
- [ ] Antes de producción: aplicar la migración (con confirmación), cargar stock por talle, configurar variables y webhook, probar con credenciales de prueba.
