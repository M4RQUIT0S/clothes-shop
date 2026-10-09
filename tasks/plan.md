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
