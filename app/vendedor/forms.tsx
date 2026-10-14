'use client'

import { useRef, useState, type FormEvent } from 'react'
import { MAX_PHOTO_BYTES, MAX_STOCK, PHOTO_TYPES, SIZES } from '@/lib/garment-form'
import { CATEGORIES, sizesOf, stockFor, type Product } from '@/lib/shop'
import { browserClient } from '@/lib/supabase/browser'
import { createGarment, deleteGarment, updateGarment, updateStock, type SellerResult } from './actions'

const FIELD = 'mt-2 min-h-11 w-full border border-line bg-transparent px-3'
const OFFLINE: SellerResult = { ok: false, error: 'No pudimos conectar. Probá de nuevo.' }

function Status({ result }: { result: SellerResult | null }) {
  return <p role="status" className="mt-4 font-sans text-sm">{result && (result.ok ? result.message : result.error)}</p>
}

/** Sube la foto al bucket «prendas» con un nombre nuevo y devuelve su ruta, o el error para mostrar. */
async function uploadPhoto(photo: File): Promise<{ path: string } | { error: string }> {
  const ext = PHOTO_TYPES[photo.type]
  if (!ext) return { error: 'La foto tiene que ser JPG, PNG o WebP.' }
  if (photo.size > MAX_PHOTO_BYTES) return { error: 'La foto pesa más de 5 MB. Usá una más liviana.' }
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await browserClient().storage.from('prendas').upload(path, photo, { contentType: photo.type })
  return error ? { error: 'No pudimos subir la foto. Probá de nuevo.' } : { path }
}

export function GarmentForm() {
  const [sizes, setSizes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SellerResult | null>(null)
  // Si el alta falla después de subir la foto, el reintento reutiliza la misma.
  const uploaded = useRef<{ file: File; path: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const photo = data.get('photo-file') as File
    if (!sizes.length) return setResult({ ok: false, error: 'Elegí al menos un talle.' })
    setBusy(true); setResult(null)
    try {
      if (uploaded.current?.file !== photo) {
        const upload = await uploadPhoto(photo)
        if ('error' in upload) return setResult({ ok: false, error: upload.error })
        uploaded.current = { file: photo, path: upload.path }
      }
      data.delete('photo-file')
      data.set('photo', uploaded.current.path)
      const saved = await createGarment(data)
      setResult(saved)
      if (saved.ok) { form.reset(); setSizes([]); uploaded.current = null }
    } catch { setResult(OFFLINE) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-2xl font-sans">
      <fieldset disabled={busy} className="space-y-6">
        <legend className="sr-only">Datos de la prenda</legend>
        <label className="block text-sm">Nombre
          <input name="name" required minLength={3} maxLength={80} className={FIELD} />
        </label>
        <label className="block text-sm">Descripción
          <textarea name="description" required minLength={20} maxLength={600} rows={4} aria-describedby="descripcion-ayuda" className={`${FIELD} py-2`} />
        </label>
        <p id="descripcion-ayuda" className="-mt-4 text-sm text-muted">Tela, corte y detalles, en al menos 20 caracteres.</p>
        <div className="grid gap-6 sm:grid-cols-3">
          <label className="block text-sm">Precio en pesos
            <input name="price" type="number" required min={1} max={99999999} step={1} inputMode="numeric" className={FIELD} />
          </label>
          <label className="block text-sm">Categoría
            <select name="category" required defaultValue="" className={FIELD}>
              <option value="" disabled>Elegí una</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">Color principal
            <input name="color" type="color" required defaultValue="#9ca3af" className={`${FIELD} cursor-pointer px-1`} />
          </label>
        </div>
        <label className="block text-sm">Foto (JPG, PNG o WebP, hasta 5 MB)
          <input name="photo-file" type="file" required accept={Object.keys(PHOTO_TYPES).join(',')} className={`${FIELD} py-2`} />
        </label>
        <fieldset>
          <legend className="text-sm">Talles y unidades en stock</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SIZES.map((size) => {
              const on = sizes.includes(size)
              return (
                <div key={size} className="flex items-center justify-between gap-2 border border-line px-3">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" name="sizes" value={size} checked={on}
                      onChange={() => { setSizes(on ? sizes.filter((s) => s !== size) : [...sizes, size]); setResult(null) }} />
                    {size}
                  </label>
                  {on && (
                    <input name={`stock-${size}`} type="number" required min={0} max={MAX_STOCK} step={1} inputMode="numeric"
                      aria-label={`Unidades del talle ${size}`} placeholder="Unid." className="min-h-11 w-16 border-l border-line bg-transparent px-2 text-right" />
                  )}
                </div>
              )
            })}
          </div>
        </fieldset>
        <button type="submit" className="label min-h-11 w-full bg-ink px-6 py-3 text-paper sm:w-auto">
          {busy ? 'Guardando…' : 'Publicar prenda'}
        </button>
      </fieldset>
      <Status result={result} />
    </form>
  )
}

type Stocked = Pick<Product, 'id' | 'name' | 'sizes' | 'product_variants'>

export function GarmentStock({ product }: { product: Stocked }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SellerResult | null>(null)

  async function run(action: (form: FormData) => Promise<SellerResult>, form: FormData) {
    setBusy(true); setResult(null)
    try { setResult(await action(form)) }
    catch { setResult(OFFLINE) }
    finally { setBusy(false) }
  }

  function remove() {
    if (!confirm(`¿Quitar «${product.name}» de la tienda? Se borra también su stock y no se puede deshacer.`)) return
    const form = new FormData()
    form.set('id', product.id)
    void run(deleteGarment, form)
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void run(updateStock, new FormData(event.currentTarget)) }} className="mt-4 font-sans">
      <input type="hidden" name="id" value={product.id} />
      <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
        <legend className="sr-only">Stock de {product.name}</legend>
        {sizesOf(product).map((size) => (
          <label key={size} className="text-sm">{size || 'Único'}
            <input name={`stock-${size}`} type="number" required min={0} max={MAX_STOCK} step={1} inputMode="numeric"
              defaultValue={stockFor(product, size)} className="mt-1 block min-h-11 w-20 border border-line bg-transparent px-2 text-right" />
          </label>
        ))}
        <button type="submit" className="label min-h-11 border border-ink px-4">{busy ? 'Guardando…' : 'Guardar stock'}</button>
        <button type="button" onClick={remove} className="label min-h-11 px-2 underline underline-offset-4">Quitar prenda</button>
      </fieldset>
      <Status result={result} />
    </form>
  )
}

type Editable = Pick<Product, 'id' | 'name' | 'price_cents'>

/** Nombre, precio y foto de una prenda ya publicada. La foto sólo cambia si se elige una nueva. */
export function GarmentEdit({ product }: { product: Editable }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SellerResult | null>(null)
  const file = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const photo = data.get('photo-file') as File
    data.delete('photo-file')
    setBusy(true); setResult(null)
    try {
      if (photo.size) {
        const upload = await uploadPhoto(photo)
        if ('error' in upload) return setResult({ ok: false, error: upload.error })
        data.set('photo', upload.path)
      }
      const saved = await updateGarment(data)
      setResult(saved)
      if (saved.ok && file.current) file.current.value = ''
    } catch { setResult(OFFLINE) }
    finally { setBusy(false) }
  }

  return (
    <details className="mt-4 font-sans">
      <summary className="label inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">Editar nombre, precio y foto</summary>
      <form onSubmit={submit} className="mt-2 max-w-2xl">
        <input type="hidden" name="id" value={product.id} />
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <legend className="sr-only">Editar {product.name}</legend>
          <label className="block text-sm">Nombre
            <input name="name" required minLength={3} maxLength={80} defaultValue={product.name} className={FIELD} />
          </label>
          <label className="block text-sm">Precio en pesos
            <input name="price" type="number" required min={1} max={99999999} step={1} inputMode="numeric" defaultValue={product.price_cents / 100} className={FIELD} />
          </label>
          <label className="block text-sm sm:col-span-2">Foto nueva (opcional; si no elegís una, queda la actual)
            <input ref={file} name="photo-file" type="file" accept={Object.keys(PHOTO_TYPES).join(',')} className={`${FIELD} py-2`} />
          </label>
          <button type="submit" className="label min-h-11 border border-ink px-4 sm:w-fit">{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        </fieldset>
        <Status result={result} />
      </form>
    </details>
  )
}
