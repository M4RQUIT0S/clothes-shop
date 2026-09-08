import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { CartProvider } from '@/components/cart'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
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
    'Tejidos honestos y cortes que no pasan de moda. Remeras, buzos, pantalones, camperas y vestidos, en un catálogo corto a propósito.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-scroll-behavior: sin él, el «scroll-behavior: smooth» que usamos para los
    // anclajes hace que Next 16 anime también el salto al cambiar de ruta (docs de
    // la v16, «Scroll Behavior Override»). Con él, los anclajes siguen suaves y la
    // navegación vuelve a ser instantánea.
    <html
      lang="es-AR"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable}`}
    >
      <body className="antialiased">
        <CartProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  )
}
