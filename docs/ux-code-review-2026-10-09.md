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
