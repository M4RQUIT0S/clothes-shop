import Link from 'next/link'
import Image from 'next/image'
import { ProductCard } from '@/components/product-card'
import { Reveal } from '@/components/reveal'
import { CatalogError } from '@/components/catalog-error'
import { NavigationLabel } from '@/components/navigation-label'
import {
  CATEGORIES,
  PRODUCT_WITH_STOCK,
  discountPct,
  formatPrice,
  isOnSale,
  supabase,
  unitPrice,
  type News,
  type Product,
} from '@/lib/shop'

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

  const [catalog, news] = await Promise.all([
    // el desempate por slug no es cosmético: sin él, dos altas con la misma fecha
    // salen en el orden físico de las filas y cualquier UPDATE reordena la portada
    supabase.from('products').select(PRODUCT_WITH_STOCK).order('created_at').order('slug'),
    supabase
      .from('news')
      .select('*')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(1),
  ])

  if (catalog.error) {
    console.error('Error cargando el catálogo:', catalog.error)
    return <CatalogError />
  }

  // Las novedades son un adorno de portada: si la tabla falla (o todavía no está
  // migrada) la tienda sigue funcionando y ese bloque simplemente no sale.
  if (news.error) console.error('Error cargando las novedades:', news.error)
  const latestNews = news.data?.[0] as News | undefined

  const all = (catalog.data ?? []) as Product[]
  const products = active ? all.filter((p) => p.category === active) : all
  const firstOf = (slug: string) => all.find((p) => p.category === slug)

  // el catálogo llega de más antiguo a más nuevo: el último es el recién ingresado
  const newest = all[all.length - 1]
  // el recién ingresado queda fuera: si además es el más rebajado, saldría dos veces
  const promo = all.reduce<Product | undefined>(
    (best, p) =>
      p !== newest && isOnSale(p) && (!best || discountPct(p) > discountPct(best)) ? p : best,
    undefined
  )

  return (
    <>
      {!active && <>
        <Hero />
        <Highlights newest={newest} promo={promo} news={latestNews} />
        <Manifesto />
      </>}

      {active && <h1 className="px-6 py-8 text-3xl font-light md:px-10">
        {CATEGORIES.find((category) => category.slug === active)?.label}
      </h1>}

      <CategoryBar active={active} />
      <h2 className="sr-only">Prendas disponibles</h2>

      {products.length === 0 ? (
        <section className="px-6 py-20 text-center">
          <h3 className="text-2xl font-light">Todavía no hay prendas {active ? 'en esta categoría' : 'disponibles'}</h3>
          <p className="mt-3 text-muted">Podés explorar el resto del catálogo.</p>
          <Link href="/#catalogo" className="label mt-6 inline-flex min-h-11 items-center underline underline-offset-4">Ver todas las prendas</Link>
        </section>
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
          Tejidos honestos para las prendas que te ponés cada semana.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-9 gap-y-3">
          <HeroLink href="#destacados" delay={400}>
            Lo último
          </HeroLink>
          <HeroLink href="#catalogo" delay={480}>
            Ver el catálogo
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
      className="rise label inline-flex min-h-11 items-center border-b border-paper/60 pb-1.5 text-paper transition-colors duration-300 ease-out hover:border-paper hover:text-paper"
    >
      {children}
    </Link>
  )
}

type Tile = {
  key: string
  kicker: string
  title: string
  meta: React.ReactNode
  image: string
  href: string
}

/** Mismo precio que enseña la tarjeta del catálogo, para que no se contradigan. */
const priceLabel = (p: Product) =>
  isOnSale(p) ? (
    <>
      <span className="line-through opacity-70">{formatPrice(p.price_cents)}</span>{' '}
      {formatPrice(unitPrice(p))}
    </>
  ) : (
    formatPrice(p.price_cents)
  )

/**
 * Lo primero que se ve bajo la portada: lo recién ingresado, lo rebajado y la última
 * novedad de la casa. Cada pieza sale de su propio dato, así que si no hay promoción
 * o no hay novedad publicada, la franja se queda con las que sí tienen algo que contar.
 */
function Highlights({ newest, promo, news }: { newest?: Product; promo?: Product; news?: News }) {
  const tiles: Tile[] = [
    newest && {
      key: 'nuevo',
      kicker: 'Recién ingresado',
      title: newest.name,
      meta: priceLabel(newest),
      image: newest.image_url,
      href: `/producto/${newest.slug}`,
    },
    promo && {
      key: 'promo',
      kicker: `Promoción · −${discountPct(promo)}%`,
      title: promo.name,
      meta: priceLabel(promo),
      image: promo.image_url,
      href: `/producto/${promo.slug}`,
    },
    news && {
      key: 'novedad',
      kicker: 'Novedades',
      title: news.title,
      meta: news.excerpt,
      image: news.image_url,
      href: news.href,
    },
  ].flatMap((t) => (t ? [t] : []))

  if (tiles.length === 0) return null

  // Faltar una pieza es un estado normal (sin promoción activa, sin novedad publicada):
  // la franja se reparte entre las que hay en vez de dejar huecos, y en solitario
  // se tumba a formato apaisado para no comerse la pantalla entera.
  const cols = tiles.length === 3 ? 'md:grid-cols-3' : tiles.length === 2 ? 'md:grid-cols-2' : ''
  const ratio = tiles.length === 1 ? 'aspect-[16/9]' : 'aspect-[4/5]'

  return (
    <section id="destacados" className="scroll-mt-24 px-1 pt-6">
      <ul className={`grid gap-1 ${cols}`}>
        {tiles.map((tile, i) => (
          <li key={tile.key}>
            <Reveal delay={i * 110}>
              <Link href={tile.href} className="group relative block">
                <div className={`relative ${ratio} w-full overflow-hidden`}>
                  <Image
                    src={tile.image}
                    alt={tile.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-[1400ms] ease-[var(--ease-soft)] group-hover:scale-[1.05]"
                  />
                  {/* el texto va en claro sobre la foto: el velo asegura el contraste
                      y se cierra un poco más en hover, que es toda la respuesta que pide */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10 opacity-90 transition-opacity duration-500 ease-out group-hover:opacity-100" />

                  <div className="absolute inset-x-6 bottom-6 text-paper">
                    <p className="label text-paper/75">{tile.kicker}</p>
                    <p className="mt-2 text-[1.3rem] font-light leading-snug">{tile.title}</p>
                    <p className="meta mt-1.5 text-paper/80">{tile.meta}</p>
                  </div>
                </div>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
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
      aria-label="Filtrar catálogo por categoría"
      className="flex scroll-mt-20 flex-wrap items-center justify-between gap-x-8 gap-y-3 border-y border-line px-6 py-5 md:px-10"
    >
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/?categoria=${c.slug}#catalogo`}
            aria-current={active === c.slug ? 'page' : undefined}
            className={`label inline-flex min-h-11 items-center transition-colors duration-300 ease-out ${
              active === c.slug ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <NavigationLabel>{c.label}</NavigationLabel>
          </Link>
        ))}
      </div>

      <Link
        href="/#catalogo"
        aria-current={!active ? 'page' : undefined}
        className={`label inline-flex min-h-11 items-center border-b pb-1 transition-colors duration-300 ease-out ${
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
              {/* PENDIENTE: los dos talleres van sin ciudad porque todavía no sé cuáles son.
                  En cuanto me los digas, aquí van los nombres: es el detalle que sostiene
                  la afirmación de trazabilidad del manifiesto. */}
              Cortamos y cosemos en dos talleres argentinos que visitamos cada
              temporada. <em>Series cortas</em>, tejidos con nombre y{' '}
              <em>patrones que se corrigen</em> hasta que caen bien.
            </p>
            <Link
              href="/?categoria=chaquetas#catalogo"
              className="label mt-9 inline-flex min-h-11 items-center border-b border-ink pb-1.5 transition-colors duration-300 ease-out hover:text-muted"
            >
              Ver las camperas
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
