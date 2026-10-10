'use client'

import { useState, useSyncExternalStore } from 'react'
import { COOKIE_CHOICE_KEY, COOKIE_CHOICE_VERSION, isCookieChoiceAccepted } from '@/lib/cookie-choice'

const CHANGE_EVENT = 'clothes-shop-cookie-choice-changed'
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener(CHANGE_EVENT, listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(CHANGE_EVENT, listener)
  }
}
function snapshot() {
  try { return isCookieChoiceAccepted(localStorage.getItem(COOKIE_CHOICE_KEY)) }
  catch { return false }
}
export function useCookieAcceptance() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
export function acceptCookies() {
  try { localStorage.setItem(COOKIE_CHOICE_KEY, JSON.stringify({ version: COOKIE_CHOICE_VERSION, acceptedAt: Date.now() })) }
  catch { /* El aviso puede cerrarse durante la navegación aunque el navegador bloquee storage. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
export function CookieChoiceReset() {
  const [notice, setNotice] = useState('')
  function reset() {
    try {
      localStorage.removeItem(COOKIE_CHOICE_KEY)
      window.dispatchEvent(new Event(CHANGE_EVENT))
      setNotice('Restablecimos tu elección. El aviso volverá a mostrarse al regresar a la tienda.')
    } catch { setNotice('El navegador bloqueó el almacenamiento. Podés borrar la elección desde los datos del sitio.') }
  }
  return (
    <div className="my-5">
      <button type="button" onClick={reset} className="meta inline-flex min-h-11 items-center underline underline-offset-4">Restablecer elección de cookies</button>
      <p role="status" className="mt-2 font-sans text-sm">{notice}</p>
    </div>
  )
}
