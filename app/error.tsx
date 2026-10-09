'use client'

import Link from 'next/link'
import { useTransition } from 'react'

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [pending, startTransition] = useTransition()
  return (
    <section data-route-fallback className="mx-auto max-w-lg px-6 py-32 text-center" aria-busy={pending}>
      <h1 className="text-3xl font-light">No pudimos mostrar esta página</h1>
      <p className="mt-4 text-muted">Volvé a intentarlo o continuá desde el catálogo.</p>
      <button type="button" disabled={pending} onClick={() => startTransition(retry)}
        className="label mt-8 min-h-11 bg-ink px-6 py-3 text-paper disabled:opacity-60">
        {pending ? 'Cargando…' : 'Volver a intentar'}
      </button>
      <Link href="/#catalogo" className="label mt-4 flex min-h-11 items-center justify-center underline underline-offset-4">
        Volver al catálogo
      </Link>
    </section>
  )
}
