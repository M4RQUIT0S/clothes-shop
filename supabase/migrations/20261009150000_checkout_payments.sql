-- Checkout real: stock por talle, pedido idempotente y confirmación de pago atómica.

-- ---------------------------------------------------------------------------
-- Stock por talle. En ropa se agota un talle, no la prenda: con un único número
-- por producto se podía vender un XL que no existía. `products.sizes` sigue
-- mandando en el orden en que se muestran los talles; el stock vive aquí.
-- ---------------------------------------------------------------------------
create table product_variants (
  product_id uuid not null references products (id) on delete cascade,
  -- '' para prendas de talle único, igual que la línea del carrito.
  size text not null,
  stock int not null default 0 check (stock >= 0),
  primary key (product_id, size)
);

alter table product_variants enable row level security;

-- Igual que el catálogo: lectura pública, escritura sólo desde el panel/servidor.
create policy "product_variants public read" on product_variants
  for select to anon, authenticated using (true);

-- Una fila por talle listado, en cero. Las cantidades reales se cargan aparte:
-- repartir el número viejo entre talles sería inventar stock.
insert into product_variants (product_id, size, stock)
select p.id, s.size, 0
from products p
cross join lateral unnest(
  case when cardinality(p.sizes) = 0 then array['']::text[] else p.sizes end
) as s(size)
on conflict do nothing;

comment on column products.stock is
  'Obsoleto desde 2026-10-09: el stock vive en product_variants, por talle.';

-- ---------------------------------------------------------------------------
-- Pedidos. `pending` queda sólo para los pedidos de la demo anterior, que no
-- tenían pago; los nuevos nacen esperando el pago.
-- ---------------------------------------------------------------------------
alter table orders
  -- Clave del intento de compra que genera el navegador: reenviar la misma
  -- devuelve el mismo pedido en vez de crear otro.
  add column idempotency_key uuid unique,
  -- Huella del contenido pedido con esa clave: la misma clave con otro
  -- contenido se rechaza en vez de devolver un pedido ajeno a lo enviado.
  add column request_hash text,
  add column subtotal_cents int check (subtotal_cents >= 0),
  add column mp_order_id text,
  add column payment_url text,
  add column payment_id text,
  add column payment_status text,
  add column paid_at timestamptz,
  add column email_sent_at timestamptz,
  add column review_reason text;

-- El default sigue en 'pending' a propósito: así la migración no cambia nada del
-- checkout anterior mientras conviva con ella. El nuevo inserta 'awaiting_payment'.
alter table orders add constraint orders_status_check
  check (status in ('pending', 'awaiting_payment', 'paid', 'payment_failed', 'needs_review'));

-- ---------------------------------------------------------------------------
-- Aplica el estado de un pago de Mercado Pago a su pedido. La llama el servidor
-- con la service role al recibir la notificación (o al volver el comprador), con
-- datos leídos de la API de Mercado Pago, nunca del navegador.
--
-- Todo ocurre en una transacción con el pedido bloqueado, así que dos
-- notificaciones del mismo pago no descuentan dos veces. Si al aprobarse falta
-- stock o el importe no coincide, el pedido va a revisión sin descuentos parciales.
-- Devuelve el estado en que queda el pedido, o 'not_found'.
-- ---------------------------------------------------------------------------
create function confirm_order_payment(
  p_order_id uuid,
  p_payment_id text,
  p_payment_status text,
  p_amount_cents bigint,
  p_currency text
) returns text
language plpgsql
set search_path = public
as $$
declare
  o orders%rowtype;
  missing int;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then
    return 'not_found';
  end if;

  -- Pedido ya cerrado: repetir la notificación no cambia nada. Que el pago cobrado
  -- se devuelva o se desconozca, o que llegue otro pago aprobado, lo manda a revisión.
  if o.status in ('paid', 'needs_review') then
    if p_payment_id = o.payment_id and p_payment_status in ('refunded', 'charged_back', 'cancelled') then
      update orders
      set status = 'needs_review', payment_status = p_payment_status,
          review_reason = concat_ws('; ', review_reason, 'pago ' || p_payment_status)
      where id = o.id;
      return 'needs_review';
    end if;
    if p_payment_id is distinct from o.payment_id and p_payment_status = 'approved' then
      update orders
      set status = 'needs_review',
          review_reason = concat_ws('; ', review_reason, 'segundo pago aprobado ' || p_payment_id)
      where id = o.id;
      return 'needs_review';
    end if;
    return o.status;
  end if;

  -- Sólo se pagan pedidos abiertos. Un pago rechazado no cierra el pedido: en
  -- Checkout Pro el comprador puede reintentar sobre la misma preferencia.
  if o.status not in ('awaiting_payment', 'payment_failed') then
    return o.status;
  end if;

  if p_payment_status = 'approved' then
    if p_currency is distinct from 'ARS' or p_amount_cents is distinct from o.total_cents then
      update orders
      set status = 'needs_review', payment_id = p_payment_id, payment_status = p_payment_status,
          paid_at = now(), review_reason = 'el importe o la moneda del pago no coinciden con el pedido'
      where id = o.id;
      return 'needs_review';
    end if;

    -- Bloquea las filas de stock en un orden fijo antes de mirarlas, para que dos
    -- pagos simultáneos se esperen en vez de cruzarse.
    perform 1
    from product_variants v
    join products p on p.id = v.product_id
    join (
      select l.slug, l.size from jsonb_to_recordset(o.items) as l(slug text, size text)
    ) l on l.slug = p.slug and l.size = v.size
    order by v.product_id, v.size
    for update of v;

    select count(*) into missing
    from (
      select l.slug, l.size, sum(l.qty) as qty
      from jsonb_to_recordset(o.items) as l(slug text, size text, qty int)
      group by l.slug, l.size
    ) l
    left join products p on p.slug = l.slug
    left join product_variants v on v.product_id = p.id and v.size = l.size
    where v.stock is null or v.stock < l.qty;

    if missing > 0 then
      update orders
      set status = 'needs_review', payment_id = p_payment_id, payment_status = p_payment_status,
          paid_at = now(), review_reason = 'sin stock suficiente al aprobarse el pago'
      where id = o.id;
      return 'needs_review';
    end if;

    update product_variants v
    set stock = v.stock - l.qty
    from (
      select l.slug, l.size, sum(l.qty) as qty
      from jsonb_to_recordset(o.items) as l(slug text, size text, qty int)
      group by l.slug, l.size
    ) l
    join products p on p.slug = l.slug
    where v.product_id = p.id and v.size = l.size;

    update orders
    set status = 'paid', payment_id = p_payment_id, payment_status = p_payment_status, paid_at = now()
    where id = o.id;
    return 'paid';
  end if;

  -- Desde aquí, avisos sin dinero. Las notificaciones pueden llegar desordenadas y un
  -- pedido puede tener varios intentos de pago: un rechazo sólo cuenta si es del
  -- intento vigente, y un «pendiente» atrasado no reabre un intento ya rechazado.
  if p_payment_status in ('rejected', 'cancelled') then
    if o.payment_id is not null and o.payment_id <> p_payment_id and o.status = 'awaiting_payment' then
      return o.status; -- hay otro intento vivo
    end if;
    update orders
    set status = 'payment_failed', payment_id = p_payment_id, payment_status = p_payment_status
    where id = o.id;
    return 'payment_failed';
  end if;

  -- pending, in_process, authorized, in_mediation...: todavía no hay dinero ni
  -- rechazo. Se registra y el pedido sigue (o vuelve a quedar) esperando el pago.
  if o.status = 'payment_failed' and o.payment_id = p_payment_id then
    return o.status; -- aviso atrasado de un intento que ya se rechazó
  end if;
  update orders
  set status = 'awaiting_payment', payment_id = p_payment_id, payment_status = p_payment_status
  where id = o.id;
  return 'awaiting_payment';
end;
$$;

-- Ni el navegador ni un usuario autenticado pueden marcar pedidos como pagados.
revoke execute on function confirm_order_payment(uuid, text, text, bigint, text) from public, anon, authenticated;
grant execute on function confirm_order_payment(uuid, text, text, bigint, text) to service_role;
