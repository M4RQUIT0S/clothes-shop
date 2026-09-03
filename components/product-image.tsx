import Image from 'next/image'

export function ProductImage({
  src,
  alt,
  color,
  sizes,
  className = '',
  priority = false,
}: {
  src: string
  alt: string
  color: string
  sizes: string
  className?: string
  priority?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: `${color}1f` }}
    >
      {src && (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      )}
    </div>
  )
}
