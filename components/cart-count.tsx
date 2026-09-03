'use client'

import Link from 'next/link'
import { useCart } from './cart'

export function CartCount({ className = '' }: { className?: string }) {
  const { count } = useCart()
  return (
    <Link href="/carrito" className={className}>
      Cesta ({count})
    </Link>
  )
}
