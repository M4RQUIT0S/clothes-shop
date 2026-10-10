-- Las líneas que exceden el límite al importar quedan en el carrito de visitante.
create or replace function private.apply_cart_operation(p_id uuid, p_kind text, p_lines jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  saved jsonb;
  prior public.cart_operations%rowtype;
  line jsonb;
  existing jsonb;
  quantity integer;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_id is null or p_kind is null or p_kind not in ('add','set','remove','merge','consume','clear')
     or p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 50
     or (p_kind = 'clear' and jsonb_array_length(p_lines) <> 0)
     or (p_kind in ('add','set','remove') and jsonb_array_length(p_lines) <> 1)
  then raise exception 'Invalid operation' using errcode = '22023'; end if;
  for line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(line) <> 'object' or not (line ?& array['slug','size','qty']) or jsonb_typeof(line->'slug') <> 'string'
       or jsonb_typeof(line->'size') <> 'string' or jsonb_typeof(line->'qty') <> 'number'
       or length(line->>'slug') not between 1 and 120 or length(line->>'size') > 20
       or (line->>'qty') !~ '^[0-9]+$'
       or (line->>'qty')::numeric < (case when p_kind = 'remove' then 0 else 1 end)
       or (line->>'qty')::numeric > 20
    then raise exception 'Invalid line' using errcode = '22023'; end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(p_lines) l group by l->>'slug', l->>'size' having count(*) > 1)
  then raise exception 'Duplicate line' using errcode = '22023'; end if;

  insert into public.account_carts(user_id) values (owner_id) on conflict do nothing;
  select items into saved from public.account_carts where user_id = owner_id for update;
  select * into prior from public.cart_operations where user_id = owner_id and operation_id = p_id;
  if found then
    if prior.kind <> p_kind or prior.lines <> p_lines then
      raise exception 'Operation reused with different data' using errcode = '22023';
    end if;
    return saved;
  end if;

  if p_kind = 'clear' then saved := '[]'; end if;
  for line in select value from jsonb_array_elements(p_lines) loop
    select value into existing from jsonb_array_elements(saved) i
      where i->>'slug' = line->>'slug' and i->>'size' = line->>'size';
    if p_kind = 'remove' or (p_kind = 'consume' and existing->>'qty' = line->>'qty') then
      select coalesce(jsonb_agg(value), '[]') into saved from jsonb_array_elements(saved) i
        where not (i->>'slug' = line->>'slug' and i->>'size' = line->>'size');
    elsif p_kind <> 'consume' then
      quantity := case p_kind
        when 'add' then least(20, coalesce((existing->>'qty')::integer, 0) + (line->>'qty')::integer)
        when 'merge' then greatest(coalesce((existing->>'qty')::integer, 0), (line->>'qty')::integer)
        else (line->>'qty')::integer end;
      line := jsonb_build_object('slug', line->>'slug', 'size', line->>'size', 'qty', quantity);
      if existing is not null then
        select jsonb_agg(case when i->>'slug' = line->>'slug' and i->>'size' = line->>'size' then line else i end)
          into saved from jsonb_array_elements(saved) i;
      elsif jsonb_array_length(saved) < 50 then saved := saved || jsonb_build_array(line);
      elsif p_kind <> 'merge' then raise exception 'Cart line limit' using errcode = '22023'; end if;
    end if;
  end loop;
  update public.account_carts set items = saved, updated_at = now() where user_id = owner_id;
  insert into public.cart_operations(user_id, operation_id, kind, lines) values (owner_id, p_id, p_kind, p_lines);
  return saved;
end;
$$;

notify pgrst, 'reload schema';
