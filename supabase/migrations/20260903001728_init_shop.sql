create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  price_cents int not null check (price_cents >= 0),
  image_url text not null default '',
  category text not null default 'general',
  sizes text[] not null default ARRAY[]::text[],
  stock int not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  address text not null,
  items jsonb not null,
  total_cents int not null check (total_cents >= 0),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table products enable row level security;
alter table orders enable row level security;

-- el catálogo es público y de sólo lectura
create policy "products public read" on products for select to anon, authenticated using (true);

-- cualquiera puede hacer un pedido; nadie puede leerlos desde el cliente
create policy "orders public insert" on orders for insert to anon, authenticated with check (true);

create index products_category_idx on products (category);
