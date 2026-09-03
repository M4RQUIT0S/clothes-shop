import Link from 'next/link'
import Image from 'next/image'
import { ProductCard } from '@/components/product-card'
import { Reveal } from '@/components/reveal'
import { CATEGORIES, supabase, type Product } from '@/lib/shop'

export const revalidate = 60

const HERO =
  'https://images.unsplash.com/photo-1594470662934-d324500d7f6b?w=2000&q=80&auto=format&fit=crop'

const GRID_SIZES = '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw'

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
  const firstOf = (slug: string) => all.find((p) => p.category === slug)

  return (
    <>
      <Hero />
      <Manifesto />

      <CategoryBar active={active} />

      {products.length === 0 ? (
        <p className="px-6 py-32 text-center text-muted">Nada por aquí todavía.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-1 gap-y-12 px-1 py-10 md:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (
            <li key={p.id}>
              {/* el retardo se corta a la cuarta pieza: más allá, la fila entra tarde */}
              <Reveal delay={(i % 4) * 90}>
                <ProductCard product={p} sizes={GRID_SIZES} />
              </Reveal>
            </li>
          ))}
        </ul>
      )}

      <Workshop lead={firstOf('chaquetas')} inset={firstOf('pantalones')} />
      <Signatures firstOf={firstOf} />
    </>
  )
}

function Hero() {
  return (
    <section className="relative h-[100svh] min-h-[34rem]">
      <Image
        src={HERO}
        alt="Prenda de lino clara en un campo al atardecer"
        fill
        sizes="100vw"
        priority
        className="object-cover"
      />
      {/* el titular va en claro: este velo lo mantiene legible sea cual sea la foto */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

      <div className="absolute inset-y-0 left-6 right-6 flex max-w-lg flex-col justify-center md:left-12 md:right-auto">
        <h1
          className="rise text-[clamp(2rem,2.9vw,2.9rem)] font-light leading-[1.05] text-paper"
          style={{ animationDelay: '120ms' }}
        >
          Fondo de <em>armario</em>
        </h1>
        <p className="rise mt-4 text-[1rem] text-paper/85" style={{ animationDelay: '260ms' }}>
          Tejidos honestos para las prendas que te pones cada semana.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-9 gap-y-3">
          <HeroLink href="#catalogo" delay={400}>
            Ver el catálogo
          </HeroLink>
          <HeroLink href="#taller" delay={480}>
            El taller
          </HeroLink>
        </div>
      </div>
    </section>
  )
}

function HeroLink({
  href,
  delay,
  children,
}: {
  href: string
  delay: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      style={{ animationDelay: `${delay}ms` }}
      className="rise label border-b border-paper/60 pb-1.5 text-paper transition-colors duration-300 ease-in hover:border-paper hover:text-paper"
    >
      {children}
    </Link>
  )
}

function Manifesto() {
  return (
    <Reveal>
      <section
        id="manifiesto"
        className="flex scroll-mt-24 flex-col gap-4 px-6 py-24 md:flex-row md:gap-12 md:px-10 md:py-28"
      >
        <p className="label shrink-0 text-muted md:mt-4">Manifiesto</p>
        <p className="max-w-4xl text-[clamp(1.35rem,2.5vw,2.15rem)] font-light leading-[1.25]">
          Hilo es una casa pequeña de ropa de diario. Trabajamos con{' '}
          <em>tejidos que se pueden rastrear</em>, cortes que aguantan más de una temporada y un
          catálogo corto a propósito: trece prendas pensadas para <em>llevarse entre ellas</em>.
        </p>
      </section>
    </Reveal>
  )
}

function CategoryBar({ active }: { active?: string }) {
  return (
    <nav
      id="catalogo"
      className="flex scroll-mt-20 flex-wrap items-center justify-between gap-x-8 gap-y-3 border-y border-line px-6 py-5 md:px-10"
    >
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/?categoria=${c.slug}`}
            className={`label transition-colors duration-300 ease-in ${
              active === c.slug ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <Link
        href="/#catalogo"
        className={`label border-b pb-1 transition-colors duration-300 ease-in ${
          active ? 'border-line text-muted hover:text-ink' : 'border-ink text-ink'
        }`}
      >
        Ver todo
      </Link>
    </nav>
  )
}

function Workshop({ lead, inset }: { lead?: Product; inset?: Product }) {
  if (!lead) return null

  return (
    <section id="taller" className="scroll-mt-24 py-24 md:py-28">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-0">
        <Reveal>
          <div className="relative h-[60vh] w-full md:h-[78vh]">
            <Image
              src={lead.image_url}
              alt={lead.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="mx-auto flex max-w-md flex-col items-center px-6 text-center">
            {inset && (
              <div className="relative mb-9 aspect-[3/4] w-48">
                <Image
                  src={inset.image_url}
                  alt={inset.name}
                  fill
                  sizes="192px"
                  className="object-cover"
                />
              </div>
            )}
            <p className="text-[1.15rem] font-light leading-[1.5]">
              Cortamos en Alicante y cosemos en el norte de Portugal, en dos talleres que
              visitamos cada temporada. <em>Series cortas</em>, tejidos con nombre y{' '}
              <em>patrones que se corrigen</em> hasta que caen bien.
            </p>
            <Link
              href="/?categoria=chaquetas"
              className="label mt-9 border-b border-ink pb-1.5 transition-colors duration-300 ease-in hover:text-muted"
            >
              Ver las chaquetas
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const SIGNATURE_SLUGS: string[] = ['sudaderas', 'pantalones', 'vestidos']

function Signatures({ firstOf }: { firstOf: (slug: string) => Product | undefined }) {
  const picks = CATEGORIES.filter((c) => SIGNATURE_SLUGS.includes(c.slug))

  return (
    <section className="px-1 pb-6">
      <Reveal>
        <h2 className="px-5 pb-8 text-[clamp(1.5rem,2.4vw,2rem)] font-light md:px-9">
          Firmas de la casa
        </h2>
      </Reveal>

      <ul className="grid gap-1 md:grid-cols-3">
        {picks.map((c, i) => {
          const product = firstOf(c.slug)
          if (!product) return null

          return (
            <li key={c.slug}>
              <Reveal delay={i * 110}>
                <Link href={`/?categoria=${c.slug}`} className="group relative block">
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <Image
                      src={product.image_url}
                      alt={c.label}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-black/15 transition-colors duration-500 group-hover:bg-black/25" />
                  </div>
                  <span className="label absolute bottom-6 left-6 border-b border-paper/60 pb-1.5 text-paper">
                    {c.label}
                  </span>
                </Link>
              </Reveal>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
