-- Una rebaja de 0 pasaba el check anterior (>= 0) y el checkout la habría cobrado
-- como gratis: isOnSale() la daba por válida y unitPrice() devolvía 0. Un cero es
-- siempre un error de carga, nunca una promoción.
alter table products drop constraint products_check;

alter table products add constraint products_sale_price_check
  check (
    sale_price_cents is null
    or (sale_price_cents > 0 and sale_price_cents < price_cents)
  );
