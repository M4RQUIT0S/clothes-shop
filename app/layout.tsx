import type { Metadata } from 'next'
import Link from 'next/link'
import { Instrument_Serif, Inter } from 'next/font/google'
import { CartProvider } from '@/components/cart'
import { CartLink } from '@/components/cart-link'
import { CATEGORIES } from '@/lib/shop'
import './globals.css'

const display = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
})

const body = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Hilo — ropa de todos los días',
  description:
    'Tienda de ropa con prendas de tejidos honestos: camisetas, sudaderas, pantalones, chaquetas y vestidos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <CartProvider>
          <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper/85 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="font-display text-2xl leading-none">
                Hilo
              </Link>
              <nav className="hidden gap-6 text-sm md:flex">
                {CATEGORIES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/?categoria=${c.slug}`}
                    className="text-ink/70 transition hover:text-ink"
                  >
                    {c.label}
                  </Link>
                ))}
              </nav>
              <CartLink />
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-ink/10 px-6 py-10 text-sm text-ink/50">
            <div className="mx-auto flex max-w-6xl flex-wrap gap-x-8 gap-y-2">
              <span>© {new Date().getFullYear()} Hilo</span>
              <span>Envío gratuito a partir de 60 €</span>
              <span>Devoluciones en 30 días</span>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  )
}
