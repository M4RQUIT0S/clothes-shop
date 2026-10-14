-- Panel del vendedor: alta y baja de prendas, stock por talle y fotos propias.

-- ---------------------------------------------------------------------------
-- Quién vende. Sólo se da de alta desde el SQL del panel de Supabase:
--   insert into public.sellers (user_id) select id from auth.users where email = '...';
-- Una cuenta puede leer únicamente su propia fila, que es lo que usan la web y
-- las políticas de abajo para saber si es vendedora.
-- ---------------------------------------------------------------------------
create table public.sellers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.sellers enable row level security;
revoke all on public.sellers from anon, authenticated;
grant select on public.sellers to authenticated;
create policy "read own seller row" on public.sellers for select to authenticated
  using ((select auth.uid()) = user_id);

create function private.is_seller() returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.sellers where user_id = (select auth.uid()))
$$;

-- ---------------------------------------------------------------------------
-- El catálogo sigue siendo de lectura pública; escribir queda para vendedores.
-- ---------------------------------------------------------------------------
create policy "sellers insert products" on public.products for insert to authenticated
  with check ((select private.is_seller()));
create policy "sellers update products" on public.products for update to authenticated
  using ((select private.is_seller())) with check ((select private.is_seller()));
create policy "sellers delete products" on public.products for delete to authenticated
  using ((select private.is_seller()));

create policy "sellers insert stock" on public.product_variants for insert to authenticated
  with check ((select private.is_seller()));
create policy "sellers update stock" on public.product_variants for update to authenticated
  using ((select private.is_seller())) with check ((select private.is_seller()));
create policy "sellers delete stock" on public.product_variants for delete to authenticated
  using ((select private.is_seller()));

-- Toda prenda lleva la misma información, entre por el panel o por SQL. Precio cero
-- es un error de carga, igual que la rebaja a cero (20260908135324).
alter table public.products add constraint products_required_fields check (
  btrim(name) <> '' and btrim(description) <> '' and btrim(image_url) <> '' and price_cents > 0
);

-- ---------------------------------------------------------------------------
-- Alta de una prenda con su stock por talle en una sola sentencia: entran las dos
-- cosas o ninguna. Corre con los permisos de quien llama, así que deciden las
-- políticas de arriba. p_stock: [{"size": "M", "stock": 3}, ...] en el orden de venta.
-- ---------------------------------------------------------------------------
create function public.create_product(
  p_slug text, p_name text, p_description text, p_price_cents int,
  p_image_url text, p_category text, p_color text, p_stock jsonb
) returns uuid
language sql security invoker set search_path = '' as $$
  with product as (
    insert into public.products (slug, name, description, price_cents, image_url, category, color, sizes)
    values (
      p_slug, p_name, p_description, p_price_cents, p_image_url, p_category, p_color,
      array(select s.v->>'size' from jsonb_array_elements(p_stock) with ordinality as s(v, i) order by s.i)
    )
    returning id
  ), variants as (
    insert into public.product_variants (product_id, size, stock)
    select product.id, s.v->>'size', (s.v->>'stock')::int
    from product, jsonb_array_elements(p_stock) as s(v)
  )
  select id from product
$$;

revoke execute on function public.create_product(text, text, text, int, text, text, text, jsonb) from public, anon;
grant execute on function public.create_product(text, text, text, int, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Fotos: bucket público (la tienda las muestra a cualquiera) en el que sólo suben
-- vendedores. Tamaño y formatos los limita el propio Storage.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prendas', 'prendas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "sellers upload garment photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'prendas' and (select private.is_seller()));
