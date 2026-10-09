export default function LoadingProduct() {
  return (
    <section className="mx-auto max-w-7xl md:grid md:grid-cols-2 md:gap-10" aria-busy="true">
      <div aria-hidden="true" className="h-[48svh] bg-line motion-safe:animate-pulse md:h-[70vh]" />
      <div className="px-6 py-8">
        <p role="status" className="meta">Cargando la prenda…</p>
        <div aria-hidden="true" className="mt-8 space-y-6 motion-safe:animate-pulse">
          <div className="h-8 w-3/4 bg-line" />
          <div className="h-4 w-1/3 bg-line" />
          <div className="h-11 bg-line" />
        </div>
      </div>
    </section>
  )
}
