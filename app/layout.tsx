import type { Metadata } from 'next'
import Link from 'next/link'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { CartProvider } from '@/components/cart'
import { BottomBar } from '@/components/bottom-bar'
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
          <p className="bg-ink px-6 py-2.5 text-center text-[0.9rem] italic text-paper">
            Envío gratuito en la península a partir de 60 €
          </p>

          <header className="border-b border-line py-7 text-center">
            <Link href="/" className="inline-block">
              <span className="block text-[1.6rem] font-light leading-none tracking-[0.42em] [text-indent:0.42em]">
                HILO
              </span>
              <span className="label mt-2 block text-muted [text-indent:0.2em] tracking-[0.2em]">
                ropa de diario
              </span>
            </Link>
          </header>

          <main>{children}</main>

          <footer className="border-t border-line px-6 py-14">
            <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-10 gap-y-3 text-center">
              <span className="label text-muted">Devoluciones en 30 días</span>
              <span className="label text-muted">Tejidos con trazabilidad</span>
              <span className="label text-muted">© {new Date().getFullYear()} Hilo</span>
            </div>
          </footer>

          <BottomBar />
        </CartProvider>
      </body>
    </html>
  )
}
