-- El envío en Argentina necesita provincia y código postal como campos propios:
-- con la dirección en un único texto libre no se puede calcular un envío ni
-- filtrar pedidos por zona. Las columnas van con default '' para no romper los
-- pedidos ya registrados; el formato lo valida el server action del checkout.
alter table orders
  add column province text not null default '',
  add column postal_code text not null default '';
