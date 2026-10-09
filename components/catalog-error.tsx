'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function CatalogError() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <section data-route-fallback className="mx-auto max-w-lg px-6 py-32 text-center" aria-busy={pending}>
      <h1 className="text-3xl font-light">No pudimos cargar el catálogo</h1>
      <p className="mt-4 text-muted">Podés volver a intentarlo o revisar las prendas de tu carrito.</p>
      <button type="button" disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="label mt-8 min-h-11 bg-ink px-6 py-3 text-paper disabled:opacity-60">
        {pending ? 'Cargando…' : 'Volver a intentar'}
      </button>
      <p role="status" className="sr-only">{pending ? 'Cargando el catálogo' : ''}</p>
    </section>
  )
}
