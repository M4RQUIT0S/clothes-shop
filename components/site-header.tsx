'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { CATEGORIES, SHIPPING_FREE_FROM, formatPrice } from '@/lib/shop'
import { useCart } from './cart'
import { MobileNav } from './mobile-nav'
import { NavigationLabel } from './navigation-label'

const NOTES = [
  `Envío gratis a todo el país desde ${formatPrice(SHIPPING_FREE_FROM)}`,
  'Cortado y cosido en talleres argentinos',
  'Devoluciones en 30 días',
]

export function SiteHeader() {
  return <Suspense fallback={<Header bleeds={false} />}><HeaderForRoute /></Suspense>
}

function HeaderForRoute() {
  const pathname = usePathname()
  const params = useSearchParams()
  const active = CATEGORIES.find((category) => category.slug === params.get('categoria'))?.slug
  return <Header active={pathname === '/' ? active : undefined} bleeds={pathname === '/' && !active} />
}

function Header({ active, bleeds }: { active?: string; bleeds: boolean }) {
  const { count } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [note, setNote] = useState(0)

  // sólo la portada abre con una foto a sangre por debajo de la cabecera
  const overHero = bleeds && !scrolled

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNote((n) => (n + 1) % NOTES.length), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <div
        className={`site-header fixed inset-x-0 top-0 z-40 transition-colors duration-500 ease-out ${
          overHero ? 'text-paper' : 'text-ink'
        }`}
      >
        {/* sobre la foto el blanco no se sostiene solo: este velo asegura el contraste
            de la navegación sea cual sea la imagen que haya debajo */}
        {overHero && (
          <div
            aria-hidden
            className="header-veil pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/50 via-black/25 to-transparent"
          />
        )}

        {/* la franja se pliega en cuanto se baja, como en el sitio de referencia */}
        <div
          className={`overflow-hidden bg-ink/90 transition-[height] duration-500 ease-[var(--ease-soft)] ${
            scrolled ? 'h-0' : 'h-8'
          }`}
        >
          <div className="flex h-8 items-center justify-between px-4 text-paper md:px-6">
            {/* la key reinicia el fundido en cada rotación */}
            <p key={note} className="fade-swap text-[0.8rem] italic">
              {NOTES[note]}
            </p>
            <p className="label hidden text-paper/60 md:block">Envíos a todo el país</p>
          </div>
        </div>

        <div
          className={`transition-colors duration-500 ease-out ${
            overHero ? 'border-b border-transparent' : 'border-b border-line bg-paper/95 backdrop-blur'
          }`}
        >
          <nav aria-label="Navegación principal" className="hidden h-14 grid-cols-[auto_1fr_auto] items-center gap-6 px-6 lg:grid xl:grid-cols-[1fr_auto_1fr]">
            <div className="flex gap-7">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/?categoria=${c.slug}#catalogo`}
                  aria-current={active === c.slug ? 'page' : undefined}
                  className="label inline-flex min-h-11 items-center transition-colors duration-300 ease-out hover:opacity-60 aria-[current=page]:underline"
                >
                  <NavigationLabel>{c.label}</NavigationLabel>
                </Link>
              ))}
            </div>

            <Link href="/" className="col-start-2 flex min-h-11 flex-col items-center justify-center text-center">
              <span className="block text-[1.4rem] font-light leading-none tracking-[0.42em] [text-indent:0.42em]">
                HILO
              </span>
              <span className="label mt-1 block text-[0.6rem] tracking-[0.26em] opacity-70 [text-indent:0.26em]">
                ropa de diario
              </span>
            </Link>

            <div className="col-start-3 flex justify-end gap-7">
              <Link href="/cuenta" className="label inline-flex min-h-11 items-center hover:opacity-60">Mi cuenta</Link>
              <Link href="/#catalogo" className="label inline-flex min-h-11 items-center transition-colors duration-300 ease-out hover:opacity-60">
                Todo
              </Link>
              <Link
                href="/carrito"
                className="label inline-flex min-h-11 items-center transition-colors duration-300 ease-out hover:opacity-60"
              >
                Carrito ({count})
              </Link>
            </div>
          </nav>

          <MobileNav active={active} />
        </div>
      </div>

      {/* la portada pasa por debajo de la cabecera; el resto reserva su hueco */}
      {!bleeds && <div aria-hidden className="h-[var(--top-h)]" />}
    </>
  )
}
