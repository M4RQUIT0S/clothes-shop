import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="mx-auto max-w-lg px-6 py-32 text-center">
      <h1 className="text-3xl font-light">No encontramos esta página</h1>
      <p className="mt-4 text-muted">La prenda puede haber cambiado o ya no estar disponible.</p>
      <Link href="/#catalogo" className="label mt-8 inline-flex min-h-11 items-center bg-ink px-6 py-3 text-paper">
        Ver prendas disponibles
      </Link>
    </section>
  )
}
