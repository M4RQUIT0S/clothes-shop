'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from './cart'
import { CATEGORIES } from '@/lib/shop'

/** Fila de navegación de móvil. Vive dentro de la cabecera fija (site-header). */
export function MobileNav() {
  const { count } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)

  // MobileNav vive en el layout y no se desmonta al navegar: si un enlace no cierra
  // el menú, el overlay se queda tapando la página de destino.
  const close = () => setMenuOpen(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <>
      {menuOpen && (
        <nav className="rise fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-paper pt-[var(--top-h)] text-ink md:hidden">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.slug}
              href={`/?categoria=${c.slug}`}
              onClick={close}
              style={{ animationDelay: `${80 + i * 60}ms` }}
              className="rise text-4xl font-light hover:italic"
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/"
            onClick={close}
            style={{ animationDelay: `${80 + CATEGORIES.length * 60}ms` }}
            className="rise label mt-6 text-muted underline underline-offset-8"
          >
            Ver todo el catálogo
          </Link>
        </nav>
      )}

      <div className={`grid h-14 grid-cols-3 px-5 md:hidden ${menuOpen ? 'text-ink' : ''}`}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
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
          className="label flex items-center justify-end pl-4 transition-opacity duration-300 ease-out hover:opacity-60"
        >
          Cesta ({count})
        </Link>
      </div>
    </>
  )
}
