export default function Loading() {
  return (
    <section data-route-fallback className="px-6 py-28" aria-busy="true" aria-label="Cargando catálogo">
      <p role="status" className="meta mb-8">Cargando prendas…</p>
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="motion-safe:animate-pulse">
            <div className="aspect-[3/4] bg-line" />
            <div className="mt-4 h-4 w-3/4 bg-line" />
            <div className="mt-3 h-3 w-1/3 bg-line" />
          </div>
        ))}
      </div>
    </section>
  )
}
