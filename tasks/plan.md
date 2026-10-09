# Plan de corrección UX — ClothesShop

Fecha: 2026-10-05. Base: `docs/ux-audit-2026-10-05.md`.

## Objetivo y forma de trabajo

Corregir todos los hallazgos del informe por etapas verificables, conservando el estilo de Hilo. El usuario pidió empezar la implementación y consultar cualquier duda antes de decidir. Las alternativas de producto pendientes se consultan expresamente; las correcciones inequívocas pueden avanzar mientras llegan respuestas.

No se toma la nota heurística como objetivo numérico: cada hallazgo debe tener una corrección comprobable. El informe original se conserva como diagnóstico fechado.

## Etapas

1. **Carrito predecible:** impedir eliminación involuntaria al editar, coherencia de límites 1–20, feedback de añadido y controles bloqueados durante el envío.
2. **Pedido consistente:** detectar cambios de precio antes de insertar, preservar adiciones posteriores, resolver reintentos sin duplicación y entregar un recibo con importes del servidor.
3. **Formulario y confirmación:** entradas válidas, mensajes honestos para el alcance elegido, referencia y resumen recuperables; estados de transporte y validación.
4. **Accesibilidad y elección:** áreas táctiles, contraste y tipografía, talle explícito, foco y anuncios de añadido.
5. **Navegación y distribución:** anclas, categorías localizadas, ficha y vistas filtradas según preferencia; retirar o resolver newsletter inactiva.
6. **Estados y verificación:** carga, vacío, errores y producto inexistente; pruebas unitarias, lint, tipos y comprobación de navegador en varios tamaños.

Las tareas concretas y su estado viven en `tasks/todo.md`.

## Decisiones pendientes de respuesta

- D1 confirmada: incorporar pagos y correo reales. Proveedor y cuenta de comercio pendientes de respuesta.
- D2 confirmada: aplicar la propuesta visual del informe manteniendo identidad general.
- D3 confirmada: selector nativo de cantidades 1–20.
- D4: estrategia para recibo y concurrencia entre pestañas: presentar propuesta concreta al implementar el contrato del pedido.
- D5: proveedor/dominio de correo y gestión de stock por talle o producto, consultados.

El nuevo alcance incorpora checkout del proveedor, confirmación de pago verificable en servidor, webhook idempotente, estados de pedido y envío real de correo. No mostrar un pedido como pagado ni prometer un correo antes de que esos hechos estén confirmados. Investigar documentación oficial una vez elegido el proveedor; preparar y validar localmente antes de cualquier configuración externa.

## Dependencias y riesgos

- Cambios de cantidad preceden a consumir líneas confirmadas del carrito.
- Contrato de cotización/recibo precede a la nueva confirmación y su persistencia.
- Ocultar hero en vista filtrada requiere adaptar cabecera y su espacio reservado en el mismo incremento.
- La interfaz no puede dar por agregado un producto rechazado por límites.
- Los precios del navegador nunca son autoridad; una aceptación de cotización sólo sirve para detectar discrepancias.
- Un fallo de transporte puede ocurrir después del INSERT: no reintentar con un identificador nuevo silenciosamente.
- `npm test` escribe pedidos en la base configurada: no usarlo para comprobaciones locales. Pruebas de lógica sin red y pruebas de integración con dobles en memoria; consultar cualquier validación que requiera escribir en un servicio real.
- No guardar email/dirección en memoria del agente ni en recibos locales persistidos.

## Comprobaciones

Por cambio de lógica: reproducción del defecto → prueba fallida → corrección → prueba aprobada. Para clases y textos estáticos, inspección de diff y navegador, sin tests que sólo copien implementación.

Tras cada etapa: pruebas pertinentes, lint/tipos cuando puedan verse afectados. Build y flujo de navegador al integrar las etapas. No repetir comandos sobre el mismo estado sin motivo.

## Registro

- Plan creado; D1–D3 consultadas. Se empieza por el tamaño táctil y las etiquetas de categoría, que corrigen problemas identificados sin elegir una alternativa pendiente.
- D1–D3 respondidas y aplicadas donde no dependen de servicios externos. Avance, evidencia y límites en `docs/ux-implementation-2026-10-05.md`; T1, T2, T6 y T7 implementadas y comprobadas. Checkout real pendiente de D4–D5 y proveedor de pago.


---

# Plan de la revisión del 2026-10-09 — checkout real

Base: `docs/traspaso-a-claude-2026-10-09.md` (revisión UX/código y checklist del 2026-10-09). Rama `fix/checkout-revision-2026-10-09`, sin mergear a `master` (master despliega producción sola).

## Decisiones del usuario (2026-10-09)

| # | Tema | Decisión |
|---|------|----------|
| D4a | Recibo | Enlace privado `/pedido/<id>?t=<token>`; el token no se guarda en claro. Sirve de URL de vuelta de Mercado Pago y va en el correo. |
| D4b | Carrito entre pestañas | Al cerrar un pedido se quitan sólo las líneas que siguen exactamente como se pidieron; lo agregado o cambiado mientras tanto se conserva con aviso. |
| D5a | Stock | Por talle: tabla de variantes producto + talle. Se descuenta de forma atómica en la base al aprobarse el pago. Las cantidades reales las carga el usuario; no se inventan. |
| D5b | Correo | Resend con dominio propio. Todavía no hay dominio: remitente configurable y pruebas hacia la dirección del usuario. |
| D6 | Pagos | Mercado Pago Checkout Pro (redirección; los datos de tarjeta no pasan por la tienda). |
| D7 | Guía de talles | Visible como **orientativa**, con procedencia explícita; una tabla de categoría nunca cuenta como medida de la prenda. |
| D8 | Base y despliegue | Migraciones probadas sin escribir en la base real; antes de aplicarlas en Supabase de producción o mergear, se consulta con el SQL exacto. |

## Diseño

**Pedido en dos tiempos.** El carrito pide una *cotización* al servidor (precios, talles y stock vigentes, envío y total, con una huella). Al confirmar, el servidor recalcula: si la huella no coincide devuelve `QUOTE_CHANGED` con la cotización nueva y **no inserta nada**; el comprador tiene que aceptar el total nuevo. Si una línea no se puede vender (talle inexistente, agotado, faltan unidades) devuelve el detalle por línea, también sin insertar.

**Idempotencia.** Cada intento lógico de compra lleva una clave generada en el navegador. La tabla `orders` tiene la clave única y una huella del contenido: reenviar la misma clave con el mismo contenido devuelve el mismo pedido (y el mismo enlace de pago); con otro contenido se rechaza. Si la respuesta se pierde, el formulario queda bloqueado en «resultado incierto» y sólo ofrece reintentar con la misma clave.

**Pago.** Con el pedido creado (`awaiting_payment`) se crea la preferencia de Checkout Pro con la referencia del pedido y el navegador va a Mercado Pago. El pago se confirma por notificación firmada al servidor (y al volver a la página del recibo); nunca se cree lo que dice el navegador. Una función SQL marca el pedido como pagado y descuenta el stock de cada talle en una sola transacción, idempotente por pago. Si al aprobarse falta stock o el importe no coincide, el pedido queda en revisión, sin descuentos parciales.

**Recibo y correo.** `/pedido/<id>?t=<token>` muestra referencia completa, líneas, importes del servidor y el estado real de pago y correo. El correo se envía una sola vez tras el pago aprobado; si no está configurado o falla, el recibo lo dice en vez de prometerlo.

**Carrito.** El navegador guarda, sin datos personales, qué se pidió. Al volver con el pago aprobado o pendiente se quitan sólo esas líneas tal cual; si el pago falló, el carrito queda intacto.

## Etapas

1. **Guía y enlaces** — guía orientativa con procedencia; enlaces de recuperación a `/#catalogo` con 44 px. *Hecho en `517a4c9`.*
2. **Base** — migración: variantes con stock por talle, columnas de pedido (clave idempotente, huella, estado, pago, correo), función de confirmación de pago y permisos. Pruebas de la migración y de la función contra Postgres local en memoria (sin red ni Docker).
3. **Lógica pura** — cotización y huella, validación de talles y stock, conciliación del carrito, token del recibo, firma de notificaciones, mapeo de estados de pago. Pruebas unitarias primero.
4. **Servicios** — cliente de Mercado Pago y de Resend con `fetch` (sin dependencias nuevas), orquestación del pedido y de la sincronización del pago con puertos sustituibles en las pruebas.
5. **Aplicación** — acciones del carrito, ruta del webhook, página del recibo, carrito con cotización, aceptación, errores de transporte y redirección; ficha y añadido rápido con stock por talle.
6. **Verificación** — unitarias, lint, tipos, build y navegador local; flujo de pago en el entorno de prueba de Mercado Pago cuando haya credenciales de prueba.
7. **Revisión adversarial** — corrección, seguridad, concurrencia, UX/accesibilidad y uso de la API de Next instalada; corregir lo confirmado.

## Lo que necesita al usuario

- Credenciales **de prueba** de Mercado Pago y clave secreta de notificaciones, en `.env.local` (no en el chat).
- Clave de Resend y la dirección a la que mandar las pruebas.
- Cantidades reales por talle antes de aplicar la migración en producción.
- Confirmación explícita antes de aplicar migraciones en producción y antes de mergear a `master`.

## Riesgos y límites conocidos

- Entre la cotización y el pago otro comprador puede llevarse la última unidad: el pedido queda en revisión para devolver el dinero; no se vende stock inexistente.
- Recargar la página durante un resultado incierto pierde los datos del formulario (no se guardan datos personales en el navegador); reintentar desde cero podría duplicar si el primer intento sí se registró. Queda documentado.
- Devoluciones y contracargos se registran pero no reponen stock automáticamente.
