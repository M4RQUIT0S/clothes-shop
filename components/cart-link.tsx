'use client'

import Link from 'next/link'
import { useCart } from './cart'

export function CartLink() {
  const { count } = useCart()

  return (
    <Link href="/carrito" className="group flex items-center gap-2 text-sm">
      <span className="group-hover:underline underline-offset-4">Carrito</span>
      <span
        className="min-w-6 rounded-full bg-ink px-2 py-0.5 text-center text-xs font-medium text-paper tabular-nums"
        aria-label={`${count} artículos en el carrito`}
      >
        {count}
      </span>
    </Link>
  )
}
