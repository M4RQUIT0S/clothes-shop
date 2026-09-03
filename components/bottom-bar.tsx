'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from './cart'
import { CATEGORIES } from '@/lib/shop'

export function BottomBar() {
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
        <nav className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-paper md:hidden">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/?categoria=${c.slug}`}
              onClick={() => setMenuOpen(false)}
              className="text-4xl font-light hover:italic md:text-5xl"
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="label mt-6 text-muted underline underline-offset-8"
          >
            Ver todo el catálogo
          </Link>
        </nav>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 items-center border-t border-line bg-paper px-6 py-4 md:hidden">
        <Link href="/" className="label justify-self-start hover:text-muted">
          Catálogo
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="label justify-self-center hover:text-muted"
        >
          {menuOpen ? 'Cerrar' : 'Menú'}
        </button>

        <Link href="/carrito" className="label justify-self-end hover:text-muted">
          Cesta ({count})
        </Link>
      </div>
    </>
  )
}
