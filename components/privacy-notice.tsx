'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { acceptCookies, useCookieAcceptance } from './cookie-choice'

export function PrivacyNotice() {
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(false)
  const accepted = useCookieAcceptance()

  if (accepted || dismissed || pathname === '/privacidad' || pathname === '/cookies') return null

  return (
    <aside aria-labelledby="privacy-notice-title" className="fixed inset-x-0 bottom-0 z-30 border border-line bg-paper p-5 text-ink shadow-lg md:inset-x-auto md:bottom-6 md:right-6 md:max-w-md">
      <div className="flex items-start justify-between gap-4">
        <h2 id="privacy-notice-title" className="text-2xl font-light">Tu privacidad en Hilo</h2>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Cerrar aviso de privacidad" className="meta -mr-2 -mt-2 inline-flex min-h-11 min-w-11 items-center justify-center underline underline-offset-4">
          Cerrar
        </button>
      </div>
      <p className="mt-2 font-sans text-sm leading-relaxed">
        Usamos cookies de sesión y almacenamiento para tu carrito y para recordar
        tu elección. Si iniciás sesión, el carrito se sincroniza con tu cuenta.
        No usamos cookies de analítica ni publicidad. Podés leer nuestras políticas,
        aún con datos pendientes de completar.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 font-sans text-sm">
        <Link href="/privacidad" className="inline-flex min-h-11 items-center underline underline-offset-4">Leer privacidad</Link>
        <Link href="/cookies" className="inline-flex min-h-11 items-center underline underline-offset-4">Leer cookies</Link>
      </div>
      <button type="button" onClick={() => { acceptCookies(); setDismissed(true) }} className="label mt-3 min-h-11 w-full bg-ink px-5 py-3 text-paper hover:bg-ink/85">
        Aceptar cookies
      </button>
    </aside>
  )
}
