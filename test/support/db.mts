// Postgres en memoria (PGlite, WASM) con las migraciones del repo: sin Docker ni red.
// No es Supabase: sólo imita los roles y permisos por defecto que las migraciones usan.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS = join(import.meta.dirname, '..', '..', 'supabase', 'migrations')

// Roles y permisos por defecto de un proyecto Supabase: service_role salta RLS y las
// tablas y funciones nuevas de public quedan concedidas a los tres roles. De Storage,
// sólo las dos tablas sobre las que las migraciones crean buckets y políticas.
const SUPABASE_ROLES = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean not null default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text not null
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
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
