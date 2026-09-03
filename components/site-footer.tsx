import Link from 'next/link'
import { CATEGORIES } from '@/lib/shop'

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[1.15rem] font-light">{title}</h3>
      <ul className="mt-5 space-y-2.5">{children}</ul>
    </div>
  )
}

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="meta text-muted transition-colors duration-300 ease-in hover:text-ink"
      >
        {children}
      </Link>
    </li>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line px-6 pb-10 pt-14 md:px-10">
      <div className="grid gap-12 md:grid-cols-4">
        <Column title="Catálogo">
          {CATEGORIES.map((c) => (
            <Item key={c.slug} href={`/?categoria=${c.slug}`}>
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
          <Item href="/carrito">Cesta</Item>
          <li className="meta text-muted">Envío gratuito desde 60 €</li>
          <li className="meta text-muted">Devoluciones en 30 días</li>
        </Column>

        <div>
          <h3 className="text-[1.15rem] font-light">Cartas de Hilo</h3>
          <p className="meta mt-5 leading-relaxed text-muted">
            Escribimos pocas veces al año: cuando entra un tejido nuevo o abrimos el taller.
            {/* ponytail: sin formulario. Un alta real necesita backend y consentimiento; el
                día que haya proveedor de correo, aquí va el input. */}
          </p>
        </div>
      </div>

      <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-line pt-6">
        <span className="meta text-muted">© {new Date().getFullYear()}, Hilo</span>
        <span className="meta text-muted">Tejidos con trazabilidad</span>
        <Link
          href="/#catalogo"
          className="meta text-muted transition-colors duration-300 ease-in hover:text-ink"
        >
          Volver al catálogo
        </Link>
      </div>
    </footer>
  )
}
