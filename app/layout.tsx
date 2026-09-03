import type { Metadata } from 'next'
import Link from 'next/link'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { CartProvider } from '@/components/cart'
import { CartCount } from '@/components/cart-count'
import { MobileNav } from '@/components/mobile-nav'
import { CATEGORIES } from '@/lib/shop'
import './globals.css'

const display = Cormorant_Garamond({
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
})

const body = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Hilo — ropa de todos los días',
  description:
    'Tejidos honestos y cortes que no caducan. Camisetas, sudaderas, pantalones, chaquetas y vestidos, en un catálogo corto a propósito.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body className="antialiased">
        <CartProvider>
          <div className="flex items-center justify-between border-b border-line px-4 py-2 md:px-6">
            <p className="text-[0.9rem] italic">Envío gratuito en la península a partir de 60 €</p>
            <p className="label hidden text-muted md:block">Devoluciones en 30 días</p>
          </div>

          <MobileNav />

          <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line px-4 py-4 md:px-6">
            <nav className="hidden gap-6 md:flex">
              {CATEGORIES.map((c) => (
                <Link key={c.slug} href={`/?categoria=${c.slug}`} className="label text-muted hover:text-ink">
                  {c.label}
                </Link>
              ))}
            </nav>

            <Link href="/" className="col-start-2 text-center">
              <span className="block text-[1.5rem] font-light leading-none tracking-[0.42em] [text-indent:0.42em]">
                HILO
              </span>
              <span className="label mt-1.5 block tracking-[0.2em] text-muted [text-indent:0.2em]">
                ropa de diario
              </span>
            </Link>

            <div className="col-start-3 hidden justify-end gap-6 md:flex">
              <Link href="/" className="label text-muted hover:text-ink">
                Todo
              </Link>
              <CartCount className="label hover:text-muted" />
            </div>
          </header>

          <main>{children}</main>

          <footer className="border-t border-line px-6 py-14">
            <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-10 gap-y-3 text-center">
              <span className="label text-muted">Devoluciones en 30 días</span>
              <span className="label text-muted">Tejidos con trazabilidad</span>
              <span className="label text-muted">© {new Date().getFullYear()} Hilo</span>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  )
}
