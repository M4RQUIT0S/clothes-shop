import Link from 'next/link'
import { ProductImage } from '@/components/product-image'
import { CATEGORIES, formatPrice, supabase, type Product } from '@/lib/shop'

export const revalidate = 60

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}) {
  const { categoria } = await searchParams
  const active = CATEGORIES.find((c) => c.slug === categoria)?.slug

  const query = supabase.from('products').select('*').order('created_at')
  const { data, error } = active ? await query.eq('category', active) : await query

  if (error) {
    console.error('Error cargando el catálogo:', error)
    return (
      <p className="mx-auto max-w-6xl px-6 py-20 text-ink/60">
        No hemos podido cargar el catálogo. Vuelve a intentarlo en un momento.
      </p>
    )
  }

  const products = (data ?? []) as Product[]

  return (
    <>
      <section className="border-b border-ink/10 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
            Ropa que dura más
            <br />
            que la temporada.
          </h1>
          <p className="mt-6 max-w-md text-ink/60">
            Tejidos honestos, cortes que no caducan y un catálogo corto a propósito.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <nav className="mb-10 flex flex-wrap gap-2">
          <FilterPill href="/" label="Todo" active={!active} />
          {CATEGORIES.map((c) => (
            <FilterPill
              key={c.slug}
              href={`/?categoria=${c.slug}`}
              label={c.label}
              active={active === c.slug}
            />
          ))}
        </nav>

        {products.length === 0 ? (
          <p className="py-16 text-center text-ink/50">Nada por aquí todavía.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/producto/${p.slug}`} className="group block">
                  <ProductImage
                    src={p.image_url}
                    alt={p.name}
                    color={p.color}
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="aspect-[4/5] w-full transition group-hover:opacity-85"
                  />
                  <h2 className="mt-4 text-sm leading-snug">{p.name}</h2>
                  <p className="mt-1 text-sm text-ink/60">{formatPrice(p.price_cents)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`border px-4 py-2 text-sm transition ${
        active ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink/60'
      }`}
    >
      {label}
    </Link>
  )
}
