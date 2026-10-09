'use client'

import { useLinkStatus } from 'next/link'

/** Dentro de Link: el indicador no cambia el ancho durante la navegación. */
export function NavigationLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus()
  return (
    <span className="relative" aria-busy={pending}>
      {children}
      <span aria-hidden="true" className={`pointer-events-none absolute -bottom-1 left-0 h-0.5 w-full bg-current ${pending ? 'motion-safe:animate-pulse' : 'invisible'}`} />
      <span role="status" className="sr-only">{pending ? 'Cargando prendas…' : ''}</span>
    </span>
  )
}
