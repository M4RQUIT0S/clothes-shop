-- Los pedidos sólo se escriben desde el servidor con la service role key.
-- El cliente público debe poder leer el catálogo, pero no fabricar pedidos.
drop policy if exists "orders public insert" on orders;
