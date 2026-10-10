'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { browserClient } from '@/lib/supabase/browser'
import { useAuth } from './auth'
import { useCart } from './cart'

export function AccountForm() {
  const { user, ready, error } = useAuth()
  const cart = useCart()
  const router = useRouter()
  const params = useSearchParams()
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    setBusy(true); setNotice('')
    try {
      const client = browserClient()
      const result = register
        ? await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
        : await client.auth.signInWithPassword({ email, password })
      if (result.error) {
        setNotice(register ? 'No pudimos crear la cuenta. Revisá los datos o probá iniciar sesión si ya tenés una.' : 'No pudimos iniciar sesión. Revisá el correo y la contraseña; si creaste una cuenta, confirmá primero el correo cuando se te haya solicitado.')
      } else if (register && !result.data.session) {
        setNotice('Revisá tu correo para confirmar la cuenta. Después podrás iniciar sesión.')
      } else { router.refresh() }
    } catch { setNotice('No pudimos conectar. Probá nuevamente en un momento.') }
    finally { setBusy(false) }
  }
  async function signOut() {
    setBusy(true); setNotice('')
    try {
      const { error } = await browserClient().auth.signOut({ scope: 'local' })
      if (error) setNotice('No pudimos cerrar la sesión. Probá nuevamente.')
      else router.refresh()
    } catch { setNotice('No pudimos cerrar la sesión. Probá nuevamente.') }
    finally { setBusy(false) }
  }
  if (!ready) return <p role="status" className="mt-8">Comprobando tu sesión…</p>
  return (
    <div className="mt-8 max-w-lg">
      {user ? (
        <>
          <p className="break-words font-sans text-base">Sesión iniciada como {user.email}.</p>
          <p className="mt-4 text-lg">Tu carrito se guarda en tu cuenta para recuperarlo en otros dispositivos.</p>
          <p role="status" className="meta mt-4 text-muted">
            {cart.sync === 'syncing' ? 'Sincronizando carrito…' : cart.sync === 'error' ? 'Hay cambios pendientes de sincronizar.' : 'Carrito sincronizado.'}
          </p>
          {cart.sync === 'error' && <button type="button" onClick={() => void cart.retrySync()} className="meta mt-4 min-h-11 underline underline-offset-4">Reintentar sincronización</button>}
          <div className="mt-6 flex flex-wrap gap-5">
            <Link href="/carrito" className="label inline-flex min-h-11 items-center bg-ink px-6 text-paper">Ver mi carrito</Link>
            <button type="button" disabled={busy} onClick={() => void signOut()} className="label min-h-11 underline underline-offset-4 disabled:opacity-50">{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-lg">Iniciá sesión para recuperar tu carrito desde otro dispositivo. También podés comprar como visitante.</p>
          <form onSubmit={submit} className="mt-6 font-sans">
            <fieldset disabled={busy} className="space-y-5">
              <legend className="sr-only">{register ? 'Crear una cuenta' : 'Iniciar sesión'}</legend>
              <label className="block text-sm">Correo electrónico
                <input name="email" type="email" required autoComplete="email" maxLength={254} className="mt-2 min-h-11 w-full border border-line bg-transparent px-3" />
              </label>
              <label className="block text-sm">Contraseña
                <input name="password" type="password" required minLength={register ? 8 : 1} maxLength={128} aria-describedby={register ? 'account-password-hint' : undefined} autoComplete={register ? 'new-password' : 'current-password'} className="mt-2 min-h-11 w-full border border-line bg-transparent px-3" />
              </label>
              {register && <p id="account-password-hint" className="text-sm text-muted">Usá al menos 8 caracteres.</p>}
              <button type="submit" className="label min-h-11 w-full bg-ink px-6 py-3 text-paper">{busy ? 'Conectando…' : register ? 'Crear cuenta' : 'Iniciar sesión'}</button>
            </fieldset>
          </form>
          <button type="button" disabled={busy} onClick={() => { setRegister(!register); setNotice('') }} className="meta mt-4 min-h-11 underline underline-offset-4">
            {register ? 'Ya tengo cuenta' : 'Crear una cuenta'}
          </button>
          <p className="mt-4 font-sans text-sm leading-relaxed text-muted">
            Al entrar combinamos tu carrito de visitante con el de tu cuenta. Si una prenda y talle están en ambos, conservamos la mayor cantidad.
          </p>
        </>
      )}
      {(notice || error || cart.warning || params.get('confirmacion') === 'error') && <p role="status" className="mt-5 font-sans text-sm leading-relaxed">{notice || error || cart.warning || 'El enlace de confirmación no es válido o venció. Revisá el último correo recibido.'}</p>}
      <p className="mt-6 font-sans text-sm leading-relaxed text-muted">
        Consultá cómo usamos tus datos en la <Link href="/privacidad" className="inline-flex min-h-11 items-center underline underline-offset-4">política de privacidad</Link>.
      </p>
    </div>
  )
}
