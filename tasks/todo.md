# Correcciones de la auditoría UX

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
