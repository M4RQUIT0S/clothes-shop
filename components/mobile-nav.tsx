'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { useCart } from './cart'
import { CATEGORIES } from '@/lib/shop'

/** Fila de navegación de móvil. Vive dentro de la cabecera fija (site-header). */
export function MobileNav({ active }: { active?: string }) {
  const { count } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const menuId = useId()

  // MobileNav vive en el layout y no se desmonta al navegar: si un enlace no cierra
  // el menú, el overlay se queda tapando la página de destino.
  const close = () => setMenuOpen(false)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (!menuOpen) {
      element.close()
      return
    }
    element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onResize = () => { if (desktop.matches) close() }
    desktop.addEventListener('change', onResize)
    return () => {
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', onResize)
      element.close()
    }
  }, [menuOpen])

  return (
    <>
      <dialog ref={dialog} id={menuId} aria-label="Menú del catálogo" onCancel={close} onClose={close}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-paper px-6 py-8 text-ink backdrop:bg-ink/40">
        <button type="button" onClick={close} className="label min-h-11 px-3 underline underline-offset-4">Cerrar menú</button>
        <nav aria-label="Categorías" className="mt-8 flex flex-col items-center justify-center gap-6">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.slug}
              href={`/?categoria=${c.slug}#catalogo`}
              aria-current={active === c.slug ? 'page' : undefined}
              onClick={close}
              style={{ animationDelay: `${80 + i * 60}ms` }}
              className="rise inline-flex min-h-11 items-center text-4xl font-light hover:italic aria-[current=page]:underline"
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/#catalogo"
            onClick={close}
            style={{ animationDelay: `${80 + CATEGORIES.length * 60}ms` }}
            className="rise label mt-6 inline-flex min-h-11 items-center text-muted underline underline-offset-8"
          >
            Ver todo el catálogo
          </Link>
        </nav>
      </dialog>

      <div className={`relative z-40 grid h-14 grid-cols-[1fr_auto_1fr] gap-3 px-5 lg:hidden ${menuOpen ? 'text-ink' : ''}`}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          className="label flex items-center pr-4 transition-opacity duration-300 ease-out hover:opacity-60"
        >
          {menuOpen ? 'Cerrar' : 'Menú'}
        </button>

        <Link href="/" className="flex items-center justify-center" onClick={close}>
          <span className="block text-[1.15rem] font-light leading-none tracking-[0.4em] [text-indent:0.4em]">
            HILO
          </span>
        </Link>

        <Link
          href="/carrito"
          onClick={close}
          className="label flex items-center justify-end whitespace-nowrap transition-opacity duration-300 ease-out hover:opacity-60"
        >
          Carrito ({count})
        </Link>
      </div>
    </>
  )
}
