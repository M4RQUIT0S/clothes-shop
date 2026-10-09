import type { SizeGuide as Guide } from '@/lib/size-guide'

const cm = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

/** Desplegable nativo: abre y cierra con teclado sin una línea de estado propia. */
export function SizeGuide({ guide, selected }: { guide: Guide; selected: string }) {
  return (
    <details className="group mt-6 border-t border-line">
      <summary className="label flex min-h-11 cursor-pointer list-none items-center justify-between text-ink transition-colors duration-200 hover:text-muted [&::-webkit-details-marker]:hidden">
        {guide.verified ? 'Guía de talles' : 'Guía de talles orientativa'}
        <span aria-hidden="true" className="text-base transition-transform duration-200 group-open:rotate-45">+</span>
      </summary>
      <div className="overflow-x-auto pb-2">
        <table className="meta w-full text-left tabular-nums">
          <caption className="pb-3 text-left text-muted">
            {guide.verified
              ? 'Medidas de esta prenda extendida, en centímetros: anchos de lado a lado, largos de punta a punta. Compará con una prenda tuya que te quede bien.'
              : 'Medidas orientativas, no tomadas de esta prenda: sirven de referencia, no para asegurar el talle. En centímetros, con la prenda extendida: anchos de lado a lado, largos de punta a punta.'}
          </caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th scope="col" className="py-2 pr-4 font-normal">Talle</th>
              {guide.columns.map((column) => (
                <th key={column} scope="col" className="py-2 pr-4 font-normal">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map(({ size, values }) => (
              <tr key={size} className={`border-b border-line ${size === selected ? 'bg-line/60' : ''}`}>
                <th scope="row" className="py-2 pr-4 font-normal">{size}</th>
                {values.map((value, i) => (
                  <td key={guide.columns[i]} className="py-2 pr-4">{cm.format(value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
