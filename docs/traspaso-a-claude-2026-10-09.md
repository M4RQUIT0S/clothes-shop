# Continuación de ClothesShop para Claude

Marco pidió pasarte la revisión completa para que implementes las correcciones. Trabajá en `D:\ClothesShop`. Antes de cambiar nada, verificá el estado actual de Git y las instrucciones vigentes. Este archivo reúne los resultados y el alcance; los informes originales siguen en `docs/ux-code-review-2026-10-09.md` y `docs/ux-checklist-2026-10-09.md`.

## Instrucción del usuario y decisiones confirmadas

El usuario pidió un plan y corregir todos los defectos encontrados, consultando cualquier duda antes de decidir. Podés sugerir una opción y explicar por qué, pero no sustituir su respuesta por tu preferencia. Ya aprobó:

- Incorporar pagos y correo reales. No volver a preguntarle si quiere conservar el checkout como demo.
- Aplicar la propuesta visual conservando colores, tipografías y estilo: ficha en dos columnas en escritorio, catálogo directo al filtrar, texto más legible y retirar newsletter sin suscripción funcional.
- Selector de cantidades de 1 a 20.

Las mejoras visuales y del selector ya están implementadas. Pagos y correo reales todavía no lo están. Consultar decisiones pendientes sobre proveedor/cuenta de cobro, proveedor de correo y dominio remitente, stock por talle o compartido por producto, recuperación protegida del recibo y conciliación del carrito entre pestañas. No elegir esos contratos sin resolver las dudas con Marco. No inventar medidas reales de prendas.

## Estado y prioridad

La revisión original se ejecutó sobre `1c660f9`; la comprobación posterior en `b4e8295` de `master` no mostró diferencias funcionales en app/components/lib/test/package.json. Volvé a verificarlo porque otro chat puede estar trabajando. La puntuación UX 51/60 (A) y el checklist 10/12 no habilitan ventas reales. Dictamen conjunto: requiere cambios.

Orden propuesto, sujeto a las decisiones que consultes:

1. Resolver guía de talles con datos provisionales presentados como reales: verificar procedencia o impedir su uso comercial.
2. Validar variantes y disponibilidad en servidor; definir stock antes de integrar reserva/descuento atómico.
3. Hacer la creación del pedido idempotente y recuperable, capturar errores de transporte y conservar el borrador y las prendas añadidas en otra pestaña.
4. Cotizar en servidor y solicitar nueva aceptación ante cambios de precio o envío, sin insertar previamente un pedido con importes diferentes.
5. Integrar los proveedores elegidos; mostrar estados reales de pedido, pago y correo; generar un recibo recuperable y referencia completa.
6. Completar los enlaces de recuperación al catálogo con objetivos táctiles de 44 × 44 px.

Los informes pegados más abajo contienen evidencia, ubicaciones, escenarios de fallo y propuestas. No son correcciones ya aplicadas.

## Instrucciones locales y validación

Leé `AGENTS.md`, `CLAUDE.md` si existe, `D:\Claude_Memory\Claude_Memory\MEMORY.md` y la nota `clothesshop-ux-audit.md`. Consultá las reglas vigentes de `C:\Users\marco\.claude\rules\` y los documentos locales pertinentes de la versión instalada de Next antes de escribir código. La documentación consultada de Next usa `retry` en error.tsx, no asumir APIs de versiones anteriores.

Plan y seguimiento existentes: `tasks/plan.md`, `tasks/todo.md`. Evidencia del primer incremento: `docs/ux-implementation-2026-10-05.md`. Actualizalos al completar trabajo. No reemplaces cambios de otros chats ni guardes secretos en documentos, Git o memoria.

La revisión de `1c660f9` aprobó 28 pruebas unitarias, lint y tipos. No se repitieron en el checklist porque el código funcional no cambió. `npm test` incluye integración con escrituras en Supabase: no ejecutarlo como si fuera sólo local. Añadí pruebas relevantes para variante inválida, agotado, stock agregado, reintento tras pérdida de respuesta, carrito concurrente, cambio de precio/envío y recuperación ante errores. No crear pedidos ni efectuar cobros reales sólo para probar.

Ya se publicó un avance en Vercel por autorización anterior. Verificá el despliegue vigente antes de describir producción. No presentar el estado actual como compra real terminada. Esta transferencia no agrega una orden nueva de desplegar automáticamente tus futuras correcciones.

## Memorando pendiente

Marco también invocó la plantilla Legal Memorandum. Quedó pendiente su respuesta sobre usar sólo el formato para el informe técnico o añadir análisis jurídico con país y asunto definidos. No inventes jurisdicción ni opinión legal. La referencia está en `C:\Users\marco\.codex\plugins\cache\openai-curated-remote\openai-templates\0.1.1\skills\artifact-template-legal-memorandum\assets\reference.docx`; se mantuvo intacta. El renderizador del runtime de Codex falló por ausencia de LibreOffice (`soffice.exe` en PATH y ubicaciones estándar comprobadas). No se creó ni entregó DOCX. Si retomás el documento, confirmá su alcance y comprobá que podés renderizar e inspeccionar todas las páginas conforme a la skill.

## Informes completos

Se incorporan a continuación las copias de ambos informes para conservar toda la evidencia en este traspaso.

# UX Audit: ClothesShop — inicio, producto y carrito

**Score: 51/60** | **Grade: A**

| Grade | Range |
|-------|-------|
| A | 50–60 |
| B | 40–49 |
| C | 30–39 |
| D | 20–29 |
| F | 0–19 |

Fecha: 2026-10-09. Código local: `1c660f9`, rama `feat/promos-novedades-y-pulido`, árbol limpio al comenzar. Incluye `437a9ec` y la nueva guía de talles. Revisión estática de las 30 leyes y de calidad de código. No se verificó que producción coincida con este commit, ni se repitió el recorrido de navegador de la revisión anterior.

Puntuación: 46/54 aplicables → 51/60 redondeado. 20 leyes con 2 puntos, 6 con 1, una con 0 y 3 N/A. La nota heurística refleja mejoras de navegación e interacción; **no significa que el checkout esté preparado para compras reales**. La revisión anterior puntuó 40/60 con el mismo denominador. La ausencia de pagos/correo se registra como alcance aprobado pendiente; no como regresión nueva.

## Critical Issues (0)

Ninguna ley de alta repercusión de la categoría Critical de la skill obtiene 0 en esta pasada. Hay problemas de corrección del pedido de prioridad P1 en la revisión de código que sigue; esta clasificación de UX no los reduce de gravedad.

## Warnings (7)

### Mental Model — Score: 1/2

**Problem:** la guía nueva presenta medidas provisionales como medidas de la prenda. El comentario reconoce que deben reemplazarse por el patrón real ([lib/size-guide.ts:7](/D:/ClothesShop/lib/size-guide.ts:7)), pero el comprador lee una instrucción para elegir talle usando esas cifras ([size-guide.tsx:16](/D:/ClothesShop/components/size-guide.tsx:16)). Además, el CTA sigue diciendo Pagar mientras el aviso describe una demo.

**Fix:** agregar procedencia/estado de verificación a las medidas y mostrar la tabla comercial sólo cuando esté verificada. Si se necesita una muestra en la demo, rotularla claramente como ejemplo que no sirve para elegir talle. No convertir una tabla genérica de categoría en medidas verificadas de cada producto. Hasta integrar pagos, alinear el CTA con el registro real.

```tsx
// Contrato propuesto, pendiente de acordar los datos reales.
type VerifiedGuide = Guide & { verified: boolean }
return guide.verified
  ? <SizeGuide guide={guide} selected={size} />
  : <p>Las medidas de esta prenda todavía no están disponibles.</p>
```

### Flow — Score: 1/2

**Problem:** bloquear cantidad/quitar en esta pestaña no protege las adiciones de otra pestaña. Al confirmar, `clear()` borra el carrito actual completo ([page.tsx:37](/D:/ClothesShop/app/carrito/page.tsx:37); [cart.tsx:64](/D:/ClothesShop/components/cart.tsx:64)).

**Fix:** conservar una instantánea del carrito enviado y consumir sólo lo confirmado. Si una línea fue modificada de forma incompatible, conservarla y ofrecer conciliación; no sustraer cantidades a ciegas. Probar A envía una prenda, B añade otra, A recibe éxito: la segunda debe permanecer.

### Peak-End Rule — Score: 0/2

**Problem:** el resultado afirma «Te enviamos los detalles por email» sin envío en la acción ([page.tsx:50](/D:/ClothesShop/app/carrito/page.tsx:50); [actions.ts:98](/D:/ClothesShop/app/carrito/actions.ts:98)). Esto permanece desde la auditoría anterior.

**Fix:** describir el resultado real y representar por separado estado del pedido, pago y correo. Hasta integrar el proveedor, usar una confirmación de pedido de prueba sin afirmar un envío.

```tsx
<h1>Pedido de prueba registrado</h1>
<p>No se realizó ningún cobro ni se envió un correo.</p>
```

### Working Memory — Score: 1/2

**Problem:** se conserva sólo un ID en estado React, se muestra truncado y desaparece al recargar. No quedan líneas ni importes consultables ([page.tsx:16](/D:/ClothesShop/app/carrito/page.tsx:16), [page.tsx:51](/D:/ClothesShop/app/carrito/page.tsx:51)).

**Fix:** devolver recibo canónico del servidor, referencia completa y resumen. Acordar recuperación protegida o persistencia local de un recibo sin datos personales. No abrir lectura pública de pedidos por UUID. Mostrar resumen de importes junto a la acción final en móvil.

### Tesler’s Law — Score: 1/2

**Problem:** el cliente muestra el precio guardado y el servidor registra el precio vigente sin solicitar aceptación de diferencias ([actions.ts:51](/D:/ClothesShop/app/carrito/actions.ts:51), [actions.ts:60](/D:/ClothesShop/app/carrito/actions.ts:60)). También puede cambiar el coste de envío.

**Fix:** separar cotización y confirmación. Volver a calcular al confirmar; ante discrepancia retornar `QUOTE_CHANGED` con líneas y total, sin INSERT. Requerir aceptar la cotización nueva. Nunca confiar en importes del cliente para fijar precios.

### Zeigarnik Effect — Score: 1/2

**Problem:** el carrito persiste, pero una excepción de la Server Action no se captura en el formulario. Puede acabar en el límite de error y desmontar los campos; tampoco se conoce si el pedido llegó a insertarse ([page.tsx:26](/D:/ClothesShop/app/carrito/page.tsx:26)).

**Fix:** capturar errores de transporte manteniendo el borrador, mostrar un estado de resultado incierto y recuperar/reintentar con la misma clave idempotente. Un `catch` que invite a reenviar con ID nuevo no resuelve el problema.

### Fitts’s Law — Score: 1/2

**Problem:** los controles principales mejoraron, pero los enlaces de recuperación del carrito vacío y de confirmación mantienen `inline-block` con borde, sin el objetivo táctil de 44 px aplicado al resto ([page.tsx:53](/D:/ClothesShop/app/carrito/page.tsx:53), [page.tsx:66](/D:/ClothesShop/app/carrito/page.tsx:66)). Además vuelven a la portada, no al catálogo anunciado.

**Fix:** usar `href="/#catalogo"` y `inline-flex min-h-11 items-center` en ambos enlaces. Verificar las cajas finales en móvil.

## Suggestions (0)

No se agregan preferencias estéticas como defectos. La incertidumbre pendiente sobre zoom, lector de pantalla y movimiento reducido requiere comprobación, no una penalización inventada.

## Compliant (20)

| # | Ley | Puntos | Evidencia en el código actual |
|---|-----|--------|------------------------------|
| 1 | Aesthetic-Usability | 2 | Tokens coherentes; muted/paper corregido y texto secundario mayor. |
| 2 | Prägnanz | 2 | Jerarquía sencilla, un CTA principal por compra. |
| 3 | Von Restorff | 2 | CTA y promociones diferenciados. |
| 4 | Similarity | 2 | Tarjetas y campos compartidos. |
| 5 | Proximity | 2 | Nombre, variante, cantidad y precio agrupados. |
| 6 | Common Region | 2 | Fieldset, filas y resumen delimitados. |
| 8 | Cognitive Load | 2 | Talle explícito y ayuda desplegable. La fiabilidad de la ayuda se evalúa en Mental Model. |
| 9 | Hick | 2 | Cinco categorías claras. |
| 10 | Miller | 2 | Navegación y grupos acotados. |
| 11 | Chunking | 2 | Datos de envío y resumen diferenciados. |
| 12 | Choice Overload | 2 | Talles rápidos bajo demanda; guía en details. |
| 13 | Cognitive Bias | 2 | Rebajas derivadas de datos, sin contadores artificiales nuevos. No se audita historial comercial. |
| 15 | Doherty | 2 | Skeletons, estado pendiente e indicadores de Link. No se midió latencia. |
| 18 | Serial Position | 2 | Compra junto a foto en escritorio, imagen más corta en móvil. |
| 22 | Jakob | 2 | Selector nativo 1–20; eliminación separada. |
| 23 | Postel | 2 | Dirección corta, email normalizado y CP flexible con límites. |
| 25 | Occam | 2 | Newsletter sin función retirada. |
| 26 | Pareto | 2 | Vista filtrada prioriza catálogo. |
| 27 | Selective Attention | 2 | Precio total y CTA destacados. |
| 29 | Paradox of the Active User | 2 | Agregar visible, mensajes persistentes y foco restaurado. |

Las siete leyes restantes aplicables aparecen arriba con su puntuación. Evidencia principal: `app/page.tsx`, `app/globals.css`, `components/{site-header,mobile-nav,quick-add,add-to-cart,product-card,size-guide}.tsx`, ficha y carrito. La inspección estática no equivale a certificación de accesibilidad.

## N/A (3)

- 7 Uniform Connectedness: no hay relaciones gráficas ni pasos que conectar.
- 17 Goal-Gradient: formulario actual de una pantalla, sin progreso multietapa.
- 30 Parkinson: no hay tarea temporizada; no inventar duración ni presión de compra.

## Action Plan (do in this order)

1. **Evitar medidas engañosas** — verificar datos o impedir el uso comercial de la tabla provisional → `components/size-guide.tsx:16`.
2. **Validar pedido en servidor** — talles existentes y disponibilidad agregada → `app/carrito/actions.ts:43`.
3. **Hacer envío recuperable** — clave idempotente, manejo de transporte y conciliación del carrito → `actions.ts:77`, `page.tsx:26`.
4. **Aceptar importes vigentes** — cotización canónica sin insertar ante diferencias → `actions.ts:51`.
5. **Confirmación honesta y recuperable** — referencia completa, recibo y estados reales de pago/correo → `page.tsx:45`.
6. **Completar recuperación táctil** — anclas y 44 px en enlaces del carrito → `page.tsx:53`.

# Review: correcciones UX y guía de talles

**Verdict: Request changes.** Se reconoce la mejora del primer incremento. La guía nueva requiere corrección antes de exponerse como medida real; los fallos heredados del checkout siguen impidiendo considerarlo listo para compra real.

## Hallazgos de código por prioridad

1. **[P1 — nuevo] Medidas provisionales presentadas como reales.** `components/size-guide.tsx:15–16`, `lib/size-guide.ts:7–8`. Un comprador puede seleccionar un talle incorrecto apoyándose en cifras que aún no pertenecen a la prenda. Propuesta y prueba: estado explícito de verificación; tabla no comercial mientras no existan medidas confirmadas. Las tres pruebas actuales verifican selección de filas, no procedencia de datos.

2. **[P1 — preexistente] El servidor acepta talles inexistentes y prendas agotadas.** `app/carrito/actions.ts:43–51`. Tras comprobar que existe el slug, copia el talle sin comprobar `product.sizes` ni `stock`. El esquema sólo limita el largo del texto y cantidad. Un carrito antiguo o petición manipulada puede registrar una variante no vendible. Validar talle en el producto y sumar cantidades del mismo producto antes de comparar disponibilidad actual; en compra real, reserva/descuento atómico según la estrategia de stock que el usuario elija. No depender del botón disabled. Probar talle inexistente, agotado y dos talles cuyo total exceda el stock compartido. No se envió una petición manipulada a producción.

3. **[P1 — preexistente] Confirmar borra adiciones posteriores de otras pestañas.** `app/carrito/page.tsx:36–38`. A inicia pedido; B añade otra prenda mientras espera; A ejecuta clear sobre el estado más reciente. Se pierde la prenda de B sin haberse pedido. Sustituir vaciado global por conciliación de la instantánea confirmada y probar cambios concurrentes.

4. **[P1 — preexistente] Reintentos pueden insertar pedidos duplicados.** `app/carrito/actions.ts:75–80`. Cada llamada crea un UUID distinto. Si el INSERT se confirmó pero la respuesta se perdió, reenviar crea otro pedido; el bloqueo local sólo cubre una pestaña. Usar clave idempotente estable por intento lógico, restricción única y recuperación segura del resultado, vinculada al contenido/sesión. No devolver datos de otros compradores sólo por conocer una clave.

5. **[P2 — preexistente; P1 antes de cobrar] Se registra un importe distinto al aceptado visualmente.** `app/carrito/actions.ts:51–61`. Cambio de promoción o umbral de envío entre añadido y envío altera el total sin consentimiento nuevo. Hoy no se cobra; no describirlo como sobrecargo ya ocurrido. Implementar el contrato de cotización descrito en Tesler y probar cambio de precio/envío.

6. **[P2 — preexistente] Una excepción de transporte abandona el formulario.** `app/carrito/page.tsx:26–34`. No hay catch alrededor del await; los errores estructurados devueltos por la acción sí se muestran, los rechazos no. Conservar borrador y tratar resultado incierto conjuntamente con idempotencia. Probar rechazo anterior y posterior a persistir usando dobles locales.

7. **[P2 — preexistente] Confirmación promete correo y pierde el recibo al recargar.** `app/carrito/page.tsx:45–51`. La acción sólo devuelve orderId. Separar los estados del pedido y correo; mostrar ID completo y recibo recuperable. Las decisiones de proveedor siguen pendientes, pero no justifican afirmar un correo ya enviado.

## Cinco ejes

| Eje | Resultado |
|-----|-----------|
| Correctness | Cambios de cantidad cubiertos; negocio del pedido conserva fallos 2–7. |
| Readability | Módulos pequeños y nombres claros. No hay motivo para una refactorización masiva. |
| Architecture | La separación de store y esquema facilita pruebas. Falta separar cotización, persistencia idempotente y finalización. |
| Security | Precios calculados en servidor y clave privada usada en Server Action. Falta validación semántica de variantes. No se verificaron políticas remotas ni controles de abuso de Vercel; no se afirma su ausencia global. |
| Performance | Lectura de productos agrupada, sin consulta por línea. Catálogo completo es razonable para el catálogo pequeño actual; paginar cuando crezca, sin bloquear por escala hipotética. |

## Verificación

- `npm run test:unit`: **28/28 aprobadas**.
- `npm run lint`: **aprobado**.
- `npx tsc --noEmit`: **aprobado**.
- Pruebas de integración revisadas, no ejecutadas: hacen peticiones y escrituras. No cubren el flujo de la Server Action ni reintentos, aceptación de precios o conciliación concurrente.
- No se repitió build, navegador, medición de accesibilidad ni despliegue en esta revisión. El build y recorrido anteriores son evidencia histórica, no prueba nueva del commit actual.
- No se modificó código funcional ni se publicaron cambios; este documento contiene propuestas, no correcciones aplicadas.

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
