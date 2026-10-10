import type { Metadata } from 'next'
import { AccountForm } from '@/components/account-form'
import { Suspense } from 'react'

export const metadata: Metadata = { title: 'Mi cuenta — Hilo', robots: { index: false, follow: false } }
export default function AccountPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:px-10">
      <p className="label text-muted">Tu espacio en Hilo</p>
      <h1 className="mt-4 text-4xl font-light md:text-5xl">Mi cuenta</h1>
      <Suspense fallback={<p role="status" className="mt-8">Comprobando tu sesión…</p>}><AccountForm /></Suspense>
    </section>
  )
}
