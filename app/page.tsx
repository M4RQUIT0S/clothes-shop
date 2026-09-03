import Link from 'next/link'
import Image from 'next/image'
import { ProductImage } from '@/components/product-image'
import { QuickAdd } from '@/components/quick-add'
import { CATEGORIES, formatPrice, supabase, type Product } from '@/lib/shop'

export const revalidate = 60

const HERO =
  'https://images.unsplash.com/photo-1594470662934-d324500d7f6b?w=2000&q=80&auto=format&fit=crop'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}) {
  const { categoria } = await searchParams
  const active = CATEGORIES.find((c) => c.slug === categoria)?.slug

  const { data, error } = await supabase.from('products').select('*').order('created_at')

  if (error) {
    console.error('Error cargando el catálogo:', error)
    return (
      <p className="px-6 py-32 text-center text-muted">
        No hemos podido cargar el catálogo. Vuelve a intentarlo en un momento.
      </p>
    )
  }

  const all = (data ?? []) as Product[]
  const products = active ? all.filter((p) => p.category === active) : all
  const countOf = (slug: string) => all.filter((p) => p.category === slug).length

  return (
    <>
      <section className="relative">
        <Image
          src={HERO}
          alt="Prenda de lino clara en un campo al atardecer"
          width={2000}
          height={1200}
          priority
          className="h-[68vh] w-full object-cover md:h-[82vh]"
        />
        {/* el titular va en claro: este velo lo mantiene legible sea cual sea la foto */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />

        <div className="absolute inset-y-0 left-6 flex max-w-sm flex-col justify-center md:left-14 md:max-w-md">
          <h1 className="text-[clamp(2.25rem,5.6vw,4.75rem)] font-light leading-[1.02] text-paper">
            Fondo de <em>armario</em>
          </h1>
          <p className="mt-4 text-[1.05rem] italic text-paper/85">
            Tejidos honestos para las prendas que te pones cada semana.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <Link href="#catalogo" className="label border-b border-paper/60 pb-1 text-paper">
              Ver el catálogo
            </Link>
            <Link href="/?categoria=chaquetas" className="label border-b border-paper/60 pb-1 text-paper">
              Chaquetas
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-24 md:py-32">
        <p className="label mb-8 text-muted">Manifiesto</p>
        <p className="text-[1.7rem] font-light leading-[1.35] md:text-[2.4rem]">
          Hilo es una casa pequeña de ropa de diario. Trabajamos con{' '}
          <em>tejidos que se pueden rastrear</em>, cortes que aguantan más de una temporada y un
          catálogo corto a propósito: trece prendas pensadas para{' '}
          <em>llevarse entre ellas</em>.
        </p>
      </section>

      <nav id="catalogo" className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y border-line px-6 py-5 scroll-mt-4">
        <CategoryLink href="/" label="Todo" count={all.length} active={!active} />
        {CATEGORIES.map((c) => (
          <CategoryLink
            key={c.slug}
            href={`/?categoria=${c.slug}`}
            label={c.label}
            count={countOf(c.slug)}
            active={active === c.slug}
          />
        ))}
      </nav>

      {products.length === 0 ? (
        <p className="px-6 py-32 text-center text-muted">Nada por aquí todavía.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-2 gap-y-10 px-2 py-10 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <div className="mb-2 flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <Link href={`/producto/${p.slug}`} className="block truncate text-[1.05rem]">
                    {p.name}
                  </Link>
                  <p className="text-[0.95rem] text-muted">{formatPrice(p.price_cents)}</p>
                </div>
                <QuickAdd product={p} />
              </div>
              <Link href={`/producto/${p.slug}`} className="group block">
                <ProductImage
                  src={p.image_url}
                  alt={p.name}
                  color={p.color}
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="aspect-[3/4] w-full transition duration-500 group-hover:opacity-90"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function CategoryLink({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: number
  active: boolean
}) {
  return (
    <Link href={href} className={`text-[1.15rem] ${active ? 'italic' : 'text-muted hover:text-ink'}`}>
      {label}
      <sup className="ml-1 text-[0.65em]">{count}</sup>
    </Link>
  )
}
