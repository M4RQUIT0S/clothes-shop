# Pre-Ship UX Check: ClothesShop — inicio, producto y carrito

Fecha: 2026-10-09. Revisión estática del código local en `master`, HEAD `b4e8295`. Sin diferencias funcionales frente a `1c660f9` en `app`, `components`, `lib`, `test` y `package.json`. La [revisión completa](ux-code-review-2026-10-09.md) mantiene sus hallazgos y puntuación de **51/60, A**. Este checklist complementa esa revisión; no certifica accesibilidad ni autoriza compras reales.

| # | Comprobación | Ley | Resultado | Evidencia o corrección |
|---|--------------|-----|-----------|------------------------|
| 1 | Acción principal prominente | Fitts, Von Restorff | ✅ PASS | Agregar y enviar pedido usan CTA ancho y contrastado en `components/add-to-cart.tsx` y `app/carrito/page.tsx`. |
| 2 | Grupos de opciones acotados | Hick, Miller | ✅ PASS | Cinco categorías; seis opciones en el filtro incluyendo Ver todo. Cabecera agrupa categorías y utilidades. Se cuentan grupos de navegación, no todas las tarjetas ni opciones de un selector nativo desplegado. |
| 3 | Elementos relacionados agrupados | Proximity, Common Region | ✅ PASS | Variantes en fieldset; imagen, talle y cantidad por línea; resumen y datos de envío diferenciados. |
| 4 | Mecanismos de respuesta inmediata | Doherty | ✅ PASS | Estado pendiente de la compra, actualizaciones locales del carrito, indicadores de navegación y skeletons. No se midieron los 400 ms; PASS acredita mecanismos presentes, no una latencia observada. |
| 5 | Convenciones de plataforma | Jakob | ✅ PASS | Enlaces para navegar, botones para acciones, campos con labels, select nativo para cantidad y dialog para menú móvil. La contradicción Pagar/demo se conserva en la revisión completa. |
| 6 | Estados hover y foco | Aesthetic-Usability, Flow | ✅ PASS | Estilos de interacción y `:focus-visible` global en `app/globals.css`. |
| 7 | Progreso visible en flujos de varios pasos | Goal-Gradient, Zeigarnik | ✅ PASS | N/A en el formulario actual de una pantalla; se cuenta como PASS según la skill. No se evalúa una pasarela futura. |
| 8 | Objetivos táctiles de al menos 44 × 44 px | Fitts | ❌ FAIL | Los enlaces de carrito vacío y confirmación conservan `inline-block` sin altura mínima. Añadir `min-h-11 min-w-11` y dirigir al catálogo. |
| 9 | Estados vacíos resueltos | Peak-End | ✅ PASS | Catálogo y carrito vacíos presentan mensaje y acción; errores de catálogo tienen recuperación. El contenido incorrecto de confirmación se evalúa en la revisión completa. |
| 10 | Información dividida en bloques | Chunking, Cognitive Load | ✅ PASS | Secciones con títulos, lista de productos, resumen y formulario organizado. |
| 11 | Jerarquía visual clara | Selective Attention, Prägnanz | ✅ PASS | Escala de encabezados, texto secundario, precio y CTA diferenciados. Evidencia estática; no se repitió el recorrido visual. |
| 12 | Complejidad resuelta por el sistema | Tesler, Occam | ❌ FAIL | El servidor puede registrar precios y envío distintos de los mostrados sin nueva aceptación. Incorporar cotización canónica y confirmación explícita de cambios. |

**PASSED: 10/12 checks.** Veredicto de la escala rápida: **SHIP WITH NOTES**.

**Veredicto conjunto: REQUEST CHANGES; no preparado para ventas reales.** La escala del checklist no incorpora validación de disponibilidad, duplicación de pedidos ni pérdida de prendas concurrentes. Los cuatro P1 del informe completo prevalecen: medidas provisionales presentadas como reales, variantes/stock sin validación semántica, vaciado global del carrito y reintentos sin idempotencia. Los siete hallazgos de código siguen abiertos; aquí no se aplicaron correcciones.

## Correcciones propuestas

### Check 8 — Enlaces de recuperación

Aplicar a ambos enlaces de `app/carrito/page.tsx:53` y `:66`, manteniendo el texto correspondiente:

```tsx
<Link href="/#catalogo" className="label mt-10 inline-flex min-h-11 min-w-11 items-center border-b border-ink">
  Ver el catálogo
</Link>
```

Verificar las cajas finales en móvil después de aplicar el cambio. El snippet es una propuesta, no una modificación realizada.

### Check 12 — Aceptación del importe

Requiere más de cinco líneas y un contrato cliente/servidor. Ver **Tesler’s Law** y el hallazgo de código 5 en la [revisión completa](ux-code-review-2026-10-09.md): recalcular en servidor, devolver `QUOTE_CHANGED` sin INSERT cuando difiere la cotización y pedir aceptación del nuevo importe. No sustituirlo por confiar en el precio enviado por el cliente.

## Alcance y evidencia

- Se leyeron nuevamente portada, cabecera, menú móvil, carrito y estilos; las fichas, componentes de compra, esquema y acción del pedido forman parte de la revisión completa del mismo código funcional.
- Los 28 tests unitarios, lint y tipos aprobados pertenecen a la revisión anterior de `1c660f9`. No se ejecutaron de nuevo porque el código funcional no cambió.
- No se ejecutaron integración con escrituras, build, pruebas de navegador ni despliegue en esta pasada. No se verificó correspondencia con producción.
- Continúan pendientes las decisiones de proveedor de pagos, correo, modelo de stock y recuperación del recibo. No se eligieron proveedores ni se inventaron medidas comerciales.

## Plantilla de memorando

Se localizaron la skill, metadatos, referencia DOCX y vista previa de **Legal Memorandum**. La referencia se mantuvo intacta. Queda pendiente confirmar si el usuario desea sólo el formato de memorando para el informe técnico o también un análisis jurídico con país y asunto definidos.

El intento de renderizar la referencia con el Python y `render_docx.py` del runtime anunciado falló con `FileNotFoundError: LibreOffice soffice.exe was not found on PATH`. Tampoco existe el ejecutable en las dos ubicaciones estándar de Program Files comprobadas. No se creó ni se entregó un DOCX sin verificación visual, ni se instalaron herramientas. La skill de documentos exige renderizar e inspeccionar todas las páginas antes de entregar; la plantilla exige conservar el diseño y verificar el documento final.
