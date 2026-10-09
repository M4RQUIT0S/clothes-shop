// Postgres en memoria (PGlite, WASM) con las migraciones del repo: sin Docker ni red.
// No es Supabase: sólo imita los roles y permisos por defecto que las migraciones usan.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS = join(import.meta.dirname, '..', '..', 'supabase', 'migrations')

// Roles y permisos por defecto de un proyecto Supabase: service_role salta RLS y las
// tablas y funciones nuevas de public quedan concedidas a los tres roles.
const SUPABASE_ROLES = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`

export const migrationFiles = () => readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()

/** Base nueva con las migraciones aplicadas; `until` corta antes de esa migración. */
export async function migratedDb({ until }: { until?: string } = {}) {
  const db = await PGlite.create()
  await db.exec(SUPABASE_ROLES)
  for (const file of migrationFiles()) {
    if (until && file >= until) break
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'))
  }
  return db
}

export async function applyMigration(db: PGlite, file: string) {
  await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'))
}
