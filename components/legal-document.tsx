import Link from 'next/link'
import type { ReactNode } from 'react'

export function LegalDocument({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-4xl px-6 pb-8 pt-36 md:px-10">
      <p className="label text-muted">Información de la tienda</p>
      <h1 className="mt-4 text-4xl font-light leading-tight md:text-5xl">{title}</h1>
      <p className="meta mt-5 text-muted">Última actualización: 10 de octubre de 2026</p>
      <div className="mt-8 border border-line p-5 font-sans text-sm leading-relaxed">
        <p className="font-semibold">Borrador con datos pendientes</p>
        <p className="mt-2">
          Podés consultar el texto completo. Los datos del titular y otros detalles todavía
          por confirmar están marcados como «Pendiente». Esta versión aún no es definitiva.
        </p>
        <p className="mt-2">Entrada en vigor: <strong>Pendiente</strong>.</p>
        <p className="mt-2">Ámbito previsto: Argentina, <strong>pendiente de confirmación</strong>.</p>
      </div>
      <nav aria-label="Políticas de la tienda" className="mt-5 flex flex-wrap gap-x-6 font-sans text-sm">
        <Link href="/privacidad" className="inline-flex min-h-11 items-center underline underline-offset-4">Privacidad</Link>
        <Link href="/cookies" className="inline-flex min-h-11 items-center underline underline-offset-4">Cookies</Link>
      </nav>
      <div className="legal-copy mt-8 font-sans text-base leading-7">
        {children}
      </div>
      <Link href="/#catalogo" className="label mt-12 inline-flex min-h-11 items-center underline underline-offset-4">
        Volver al catálogo
      </Link>
    </article>
  )
}
