# Avance de correcciones UX — 2026-10-05

## Decisiones del usuario

- Implementar pagos y correo reales, ampliando el alcance de la demo.
- Aplicar la distribución propuesta: ficha en dos columnas, resultados directos al filtrar, mejor legibilidad y retirada de Cartas de Hilo, conservando identidad visual.
- Usar selector nativo de cantidad entre 1 y 20.
- Consultar dudas de producto antes de decidir. Pendientes: proveedor/cuenta de pago, correo/dominio remitente y stock por talle o producto. El recibo recuperable y la conciliación entre pestañas también requieren concretar el contrato.

## Cambios implementados

- Cantidades válidas sin eliminación implícita; mensajes al llegar a límites y validación de carritos guardados. Fallos de almacenamiento conservan la sesión en memoria y muestran un aviso.
- Cantidad y quitar deshabilitados durante el envío local. Los controles distinguen producto y talle para tecnologías de asistencia.
- Talle sin selección implícita cuando hay varias opciones; añadido rápido con texto, talles que se ajustan al ancho, confirmación persistente y devolución de foco.
- Superficies táctiles de 44 px, textos secundarios mayores, contraste muted/paper de 4,97:1 y foco visible.
- Ficha en dos columnas desde 768 px, imagen más corta en móvil y categorías con vocabulario local.
- Enlaces de categorías con ancla, vista filtrada sin portada editorial y cabecera adaptada; pie sin newsletter inactiva.
- Carga de catálogo/producto, indicadores de navegación, reintento de catálogo, límite de error y página 404 con regreso al catálogo. La cabecera mantiene fondo legible al mostrar un fallo o carga sin fotografía.
- Menú móvil con diálogo nativo, fondo inerte, cierre con Escape, retorno de foco y cierre al navegar.
- Dirección corta admitida, email normalizado, CP con espacios exteriores y límites de campos compartidos entre cliente y servidor. El cliente no importa Zod sólo para consultar esos límites.

## Verificación realizada

- 25 pruebas unitarias locales aprobadas. Cobertura de los nuevos módulos de carrito y validación: 98,08 % de líneas, 97,30 % de ramas y 100 % de funciones. No representa cobertura de toda la interfaz.
- ESLint sin errores; build de Next 16.3.4 completado con comprobación TypeScript y 18 páginas generadas.
- Navegador local: portada, catálogo, carrito y añadido rápido a 360 px; ficha a 768 y 1440 px; navegación de escritorio a 1024 px. No se detectó desbordamiento horizontal en las pantallas comprobadas.
- Cantidad 1 → 2 conserva el texto de dirección; precio visible dentro del carrito móvil. Talles y controles medidos en aproximadamente 44 px (redondeo del navegador).
- Menú: apertura modal, Escape devuelve foco a Menú, enlace Remeras cierra el diálogo y abre resultados. Añadido rápido anuncia talle L y devuelve foco al disparador.
- Ficha: ninguna variante elegida y CTA deshabilitado hasta elegir. Producto inexistente muestra 404 recuperable; enlace vuelve al catálogo.
- Formulario: datos ficticios locales, sin enviar; dirección corta y CPA en minúsculas con espacios cumplen validación nativa.
- Evidencia visual: `ux-evidence/producto-desktop.jpg`.

## Pendiente y límites

El checkout sigue siendo el registro de demo anterior. Aún conserva la promesa de correo y el CTA de pago que se sustituirán con la integración real elegida; no debe presentarse este incremento como checkout terminado.

Faltan cotización y aceptación de precios cambiados, recibo recuperable, protección frente a duplicados/reintentos, conservación de adiciones de otras pestañas, manejo del resultado incierto de transporte, confirmación verificable de pago, stock y correo real. No se creó ningún pedido ni se efectuaron cobros/envíos; no se ejecutó `npm test`, porque incluye escrituras en la base configurada.

Las pantallas de catálogo vacío, errores de red y reintentos fueron implementadas y revisadas estáticamente, pero no se inyectaron esos fallos en navegador. Tampoco se verificó con lector de pantalla, zoom 200 % o emulación de movimiento reducido. No se asigna una nueva puntuación UX hasta completar la revisión restante.

## Despliegue solicitado por el usuario

Publicado en producción en https://clothes-shop-wheat.vercel.app, despliegue `dpl_6x885AGM6JK48Tcgo5KVQTiNYU9J` con estado READY. Se subió el árbol de trabajo local, incluidos los cambios sin commit; no se hizo push a GitHub. Build remoto y TypeScript aprobados. Se agregó `.vercelignore` para excluir copias locales de trabajo, archivos de entorno, documentación y artefactos temporales; se usan las variables ya configuradas en Vercel.

Verificación cerrada el 2026-10-06: portada, categoría Remeras, ficha con talle obligatorio, añadido y carrito con selector 1–20 e importes actualizados. Consola del navegador sin errores durante el recorrido. La consulta de logs de error de este despliegue no devolvió registros; esto no acredita monitoreo continuo. Evidencia: `ux-evidence/carrito-vercel.jpg`. No se envió el formulario ni se crearon pedidos. La publicación sigue siendo demo: pagos y correo reales permanecen pendientes.
