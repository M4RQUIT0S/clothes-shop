'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from './cart'
import { CATEGORIES } from '@/lib/shop'

/** Fila de navegación de móvil. Vive dentro de la cabecera fija (site-header). */
export function MobileNav() {
  const { count } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
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
              onClick={() => setMenuOpen(false)}
              style={{ animationDelay: `${80 + i * 60}ms` }}
              className="rise text-4xl font-light hover:italic"
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            style={{ animationDelay: `${80 + CATEGORIES.length * 60}ms` }}
            className="rise label mt-6 text-muted underline underline-offset-8"
          >
            Ver todo el catálogo
          </Link>
        </nav>
      )}

      <div className={`grid h-14 grid-cols-3 items-center px-5 md:hidden ${menuOpen ? 'text-ink' : ''}`}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="label justify-self-start transition-opacity duration-300 ease-in hover:opacity-60"
        >
          {menuOpen ? 'Cerrar' : 'Menú'}
        </button>

        <Link href="/" className="justify-self-center" onClick={() => setMenuOpen(false)}>
          <span className="block text-[1.15rem] font-light leading-none tracking-[0.4em] [text-indent:0.4em]">
            HILO
          </span>
        </Link>

        <Link
          href="/carrito"
          className="label justify-self-end transition-opacity duration-300 ease-in hover:opacity-60"
        >
          Cesta ({count})
        </Link>
      </div>
    </>
  )
}
