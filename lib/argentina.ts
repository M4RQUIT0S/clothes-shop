/**
 * Datos de localización argentina que comparten el formulario del checkout y su
 * validación en servidor. Viven juntos a propósito: si la lista del desplegable y
 * la que valida el servidor se separan, el formulario ofrece opciones que el
 * servidor rechaza.
 */

/** Las 24 jurisdicciones: 23 provincias más la Ciudad Autónoma de Buenos Aires. */
export const PROVINCES = [
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const

export type Province = (typeof PROVINCES)[number]

/** El navegador acepta los mismos espacios exteriores que normaliza el servidor. */
export const POSTAL_CODE_PATTERN = String.raw`\s*(?:[A-Za-z][0-9]{4}[A-Za-z]{3}|[0-9]{4})\s*`

/** CPA de ocho caracteres, el vigente desde 1998: letra, cuatro dígitos, tres letras. */
const CPA = /^[A-Za-z]\d{4}[A-Za-z]{3}$/

/** El de cuatro dígitos sigue siendo el que la gente se sabe de memoria. */
const CUATRO_DIGITOS = /^\d{4}$/

export const isPostalCode = (value: string) => {
  const v = value.trim()
  return CPA.test(v) || CUATRO_DIGITOS.test(v)
}

/** El CPA se escribe en mayúsculas; normalizar evita guardar el mismo CP de dos formas. */
export const normalizePostalCode = (value: string) => value.trim().toUpperCase()
