import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const APP = join(import.meta.dirname, '..', 'app')

// Un loading.tsx es un límite de Suspense: la respuesta empieza en streaming con 200 y
// notFound() ya no puede cambiarla a 404. Ninguno puede envolver la ficha de producto.
test('la ficha de producto no queda dentro de un loading.tsx, para que una prenda inexistente dé 404', () => {
  for (const segment of ['', 'producto', join('producto', '[slug]')]) {
    assert.equal(existsSync(join(APP, segment, 'loading.tsx')), false, `app/${segment}/loading.tsx`)
  }
})
