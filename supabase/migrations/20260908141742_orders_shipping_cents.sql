-- El pedido guardaba sólo la suma de las prendas, así que el total registrado no
-- coincidía con el «Pagar $ X» que vio el comprador: faltaba el envío. Se guarda
-- desglosado y no derivado, para que la fila siga siendo auditable el día que
-- cambien las tarifas de envío.
alter table orders
  add column shipping_cents int not null default 0 check (shipping_cents >= 0);
