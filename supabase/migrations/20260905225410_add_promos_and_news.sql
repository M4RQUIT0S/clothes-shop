-- Promoción: precio rebajado opcional. null = sin promoción, y el check impide
-- que una "rebaja" acabe siendo más cara que el precio de tarifa.
alter table products
  add column sale_price_cents int
    check (sale_price_cents is null or (sale_price_cents >= 0 and sale_price_cents < price_cents));

-- Novedades de la casa: entradas cortas con foto y enlace, para la portada.
create table news (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  image_url text not null default '',
  href text not null default '/',
  published_at timestamptz not null default now()
);

alter table news enable row level security;

-- mismas reglas que el catálogo: lectura pública, escritura sólo desde el panel
create policy "news public read" on news for select to anon, authenticated using (true);

create index news_published_at_idx on news (published_at desc);

-- la portada pide siempre lo más reciente y lo rebajado
create index products_created_at_idx on products (created_at desc);
create index products_sale_idx on products (sale_price_cents) where sale_price_cents is not null;
