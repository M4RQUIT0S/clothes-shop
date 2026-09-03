// ponytail: siluetas SVG en vez de fotos. products.image_url ya existe en el
// esquema: cuando haya fotos reales, renderiza <img> y borra este componente.
const SHAPES: Record<string, string> = {
  camisetas:
    'M70 30 L55 38 L20 60 L38 92 L58 80 L58 230 L142 230 L142 80 L162 92 L180 60 L145 38 L130 30 C130 48 116 58 100 58 C84 58 70 48 70 30 Z',
  sudaderas:
    'M68 42 L52 50 L18 74 L36 106 L56 94 L56 238 L144 238 L144 94 L164 106 L182 74 L148 50 L132 42 C132 20 118 10 100 10 C82 10 68 20 68 42 Z',
  pantalones: 'M60 20 L140 20 L146 240 L108 240 L100 120 L92 240 L54 240 Z',
  chaquetas:
    'M72 34 L54 44 L20 70 L40 104 L58 92 L58 238 L142 238 L142 92 L160 104 L180 70 L146 44 L128 34 L100 68 Z',
  vestidos:
    'M72 34 L56 42 L26 64 L42 94 L60 84 L58 120 L34 240 L166 240 L142 120 L140 84 L158 94 L174 64 L144 42 L128 34 C128 50 115 60 100 60 C85 60 72 50 72 34 Z',
}

const DETAILS: Record<string, string> = {
  sudaderas: 'M70 168 H130 V204 H70 Z M78 60 V96 M122 60 V96',
  chaquetas: 'M72 34 L100 68 L128 34 M100 68 V238 M64 172 H86 M114 172 H136',
  pantalones: 'M60 44 H140 M100 44 V120',
}

export function ProductArt({
  category,
  color,
  className = '',
}: {
  category: string
  color: string
  className?: string
}) {
  const shape = SHAPES[category] ?? SHAPES.camisetas
  const detail = DETAILS[category]

  return (
    <svg
      viewBox="0 0 200 260"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-hidden="true"
      className={className}
      style={{ backgroundColor: `${color}1f` }}
    >
      <path d={shape} fill={color} />
      {detail && (
        <path d={detail} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" />
      )}
    </svg>
  )
}
