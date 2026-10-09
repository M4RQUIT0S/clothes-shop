/**
 * Medidas de la prenda (no del cuerpo), en centímetros y con la prenda extendida
 * sobre una superficie plana. Es lo que permite comparar con una prenda propia que
 * ya calza bien, que es la forma más fiable de acertar el talle comprando online.
 *
 * ponytail: tablas por categoría con excepciones por slug para los cortes que se
 * apartan (oversize, cintura elástica, silueta corta). Si el catálogo pasa a
 * cargarse desde un panel, mover esto a una columna jsonb de `products`.
 *
 * Procedencia: una tabla de categoría es genérica por definición y nunca cuenta
 * como medida de la prenda. Una tabla por slug sólo pasa a `verified: true` cuando
 * sus cifras salen del patrón real de esa prenda; hasta entonces la ficha la
 * muestra como orientativa.
 */
type Chart = { columns: readonly string[]; rows: Record<string, readonly number[]> }
type GarmentChart = Chart & { verified: boolean }

const UPPER = ['Pecho', 'Largo', 'Manga'] as const

const BY_CATEGORY: Record<string, Chart> = {
  camisetas: {
    columns: UPPER,
    rows: { XS: [48, 68, 19], S: [50, 70, 20], M: [53, 72, 21], L: [56, 74, 22], XL: [59, 76, 23] },
  },
  sudaderas: {
    columns: UPPER,
    rows: {
      XS: [52, 66, 60], S: [55, 68, 61], M: [58, 70, 62],
      L: [61, 72, 63], XL: [64, 74, 64], XXL: [67, 76, 65],
    },
  },
  pantalones: {
    columns: ['Cintura', 'Cadera', 'Tiro', 'Entrepierna'],
    rows: {
      38: [38, 48, 26, 80], 40: [40, 50, 26.5, 81], 42: [42, 52, 27, 82],
      44: [44, 54, 27.5, 82], 46: [46, 56, 28, 83], 48: [48, 58, 28.5, 83],
    },
  },
  chaquetas: {
    columns: UPPER,
    rows: { S: [56, 64, 63], M: [59, 66, 64], L: [62, 68, 65], XL: [65, 70, 66] },
  },
  vestidos: {
    columns: ['Busto', 'Cintura', 'Cadera', 'Largo'],
    rows: {
      XS: [42, 34, 46, 112], S: [44, 36, 48, 114], M: [47, 39, 51, 116],
      L: [50, 42, 54, 118], XL: [53, 45, 57, 120],
    },
  },
}

const BY_SLUG: Record<string, GarmentChart> = {
  'camiseta-oversize-negra': {
    verified: false,
    columns: UPPER,
    rows: { S: [58, 72, 22], M: [61, 74, 23], L: [64, 76, 24], XL: [67, 78, 25], XXL: [70, 80, 26] },
  },
  'pantalon-lino-arena': {
    verified: false,
    columns: ['Cintura', 'Cadera', 'Tiro', 'Entrepierna'],
    rows: { S: [36, 52, 29, 74], M: [39, 55, 30, 75], L: [42, 58, 31, 76], XL: [45, 61, 32, 77] },
  },
  'bomber-tecnica-negra': {
    verified: false,
    columns: UPPER,
    rows: { S: [57, 60, 63], M: [60, 62, 64], L: [63, 64, 65], XL: [66, 66, 66] },
  },
}

export type SizeGuide = {
  columns: readonly string[]
  rows: { size: string; values: readonly number[] }[]
  /** true sólo si las cifras son del patrón real de esta prenda. */
  verified: boolean
}

/**
 * Tabla de la prenda limitada a los talles que se venden, en su orden. Devuelve null
 * si no hay medidas para ninguno: mejor no mostrar tabla que mostrar una vacía.
 */
export function sizeGuideFor(product: { slug: string; category: string; sizes: string[] }): SizeGuide | null {
  const own = BY_SLUG[product.slug]
  const chart = own ?? BY_CATEGORY[product.category]
  if (!chart) return null
  const rows = product.sizes.flatMap((size) => (chart.rows[size] ? [{ size, values: chart.rows[size] }] : []))
  return rows.length ? { columns: chart.columns, rows, verified: own?.verified ?? false } : null
}
