'use client'

import { unstable_rethrow } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CartItem } from '@/lib/cart'
import { quoteCart, type QuoteResult } from './actions'

const keyOf = (items: CartItem[]) => JSON.stringify(items.map(({ slug, size, qty }) => [slug, size, qty]))

/**
 * Cotización del servidor para el carrito actual. Se pide de nuevo cada vez que cambia
 * qué o cuánto se lleva (no el precio guardado, que es justo lo que la cotización
 * corrige). Un resultado sólo vale para el carrito con el que se pidió.
 */
export function useQuote(items: CartItem[], onQuoted: (result: QuoteResult) => void) {
  const key = keyOf(items)
  const [state, setState] = useState<{ key: string; result: QuoteResult } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (items.length === 0) return
    let current = true
    quoteCart(items.map(({ slug, size, qty }) => ({ slug, size, qty })))
      .then((result) => {
        if (!current) return
        setState({ key, result })
        onQuoted(result)
      })
      .catch((error) => {
        unstable_rethrow(error)
        if (current) setState({ key, result: { ok: false, error: 'No pudimos calcular el total. Revisá tu conexión y probá de nuevo.' } })
      })
    return () => { current = false }
    // `items` entra por `key`: volver a cotizar sólo si cambia qué o cuánto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  return {
    result: state?.key === key ? state.result : null,
    /** Reemplaza la cotización vigente, por ejemplo con la que devolvió QUOTE_CHANGED. */
    replace: (result: QuoteResult) => setState({ key, result }),
    retry: () => setAttempt((n) => n + 1),
  }
}
