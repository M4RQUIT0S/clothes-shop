import Link from 'next/link'
import { CATEGORIES, SHIPPING_FREE_FROM, formatPrice } from '@/lib/shop'

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[1.15rem] font-light">{title}</h2>
      <ul className="mt-5 space-y-2.5">{children}</ul>
    </div>
  )
}

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="meta inline-flex min-h-11 items-center text-muted transition-colors duration-300 ease-out hover:text-ink"
      >
        {children}
      </Link>
    </li>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line px-6 pb-10 pt-14 md:px-10">
      <div className="grid gap-12 md:grid-cols-3">
        <Column title="Catálogo">
          {CATEGORIES.map((c) => (
            <Item key={c.slug} href={`/?categoria=${c.slug}#catalogo`}>
              {c.label}
            </Item>
          ))}
        </Column>
        <Column title="La casa">
          <Item href="/#manifiesto">Manifiesto</Item>
          <Item href="/#taller">El taller</Item>
          <Item href="/#catalogo">Ver todo</Item>
        </Column>

        <Column title="Tienda">
          <Item href="/carrito">Carrito</Item>
          <Item href="/cuenta">Mi cuenta</Item>
          <Item href="/privacidad">Política de privacidad</Item>
          <Item href="/cookies">Política de cookies</Item>
          <Item href="/terminos">Términos y condiciones</Item>
          <li className="meta text-muted">Envío gratis desde {formatPrice(SHIPPING_FREE_FROM)}</li>
          <Item href="/terminos#cambios-y-devoluciones">Devoluciones en 30 días</Item>
        </Column>

      </div>

      <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-line pt-6">
        <span className="meta text-muted">© {new Date().getFullYear()}, Hilo</span>
        <span className="meta text-muted">Tejidos con trazabilidad</span>
        <Link
          href="/#catalogo"
          className="meta inline-flex min-h-11 items-center text-muted transition-colors duration-300 ease-out hover:text-ink"
        >
          Volver al catálogo
        </Link>
      </div>
    </footer>
  )
}
