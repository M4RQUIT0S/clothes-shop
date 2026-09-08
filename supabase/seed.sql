-- Catálogo de arranque. Los ids y created_at los pone la propia tabla.
insert into products (slug, name, description, price_cents, image_url, category, sizes, stock, color) values
  ('camiseta-algodon-organico', 'Remera de algodón orgánico', 'Punto de algodón orgánico 180 g/m². Corte recto, cuello reforzado y hombro caído. La remera que se pone sola cada mañana.', 2490, 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1400&q=80&auto=format&fit=crop', 'camisetas', '{XS,S,M,L,XL}', 40, '#e7e5e4'),
  ('camiseta-rayas-marineras', 'Remera a rayas marineras', 'Rayas bretonas tejidas, no estampadas. Manga francesa y bajo recto. Envejece bien lavado tras lavado.', 3290, 'https://images.unsplash.com/photo-1591224615614-e300d72e37c5?w=1400&q=80&auto=format&fit=crop', 'camisetas', '{S,M,L,XL}', 25, '#1e3a5f'),
  ('camiseta-oversize-negra', 'Remera oversize negra', 'Jersey pesado de 240 g/m² con caída amplia. Negro profundo que no vira a gris.', 2990, 'https://images.unsplash.com/photo-1562135291-7728cc647783?w=1400&q=80&auto=format&fit=crop', 'camisetas', '{S,M,L,XL,XXL}', 32, '#18181b'),
  ('sudadera-capucha-crema', 'Buzo con capucha crema', 'Felpa perchada por dentro, 380 g/m². Cordón de algodón y bolsillo canguro con fondo reforzado.', 5990, 'https://images.unsplash.com/photo-1526476148966-98bd039463ea?w=1400&q=80&auto=format&fit=crop', 'sudaderas', '{S,M,L,XL}', 18, '#f5f0e6'),
  ('sudadera-cuello-redondo-verde', 'Buzo cuello redondo verde', 'Verde musgo teñido en prenda. Puños acanalados que recuperan la forma.', 5490, 'https://images.unsplash.com/photo-1642031769318-4e34afda56fb?w=1400&q=80&auto=format&fit=crop', 'sudaderas', '{XS,S,M,L,XL}', 22, '#4b5f47'),
  ('hoodie-gris-jaspeado', 'Buzo canguro gris jaspeado', 'Mezcla de algodón y poliéster reciclado. Capucha de doble capa y cierre metálico.', 6490, 'https://images.unsplash.com/photo-1594656375376-64d56e2f3ed1?w=1400&q=80&auto=format&fit=crop', 'sudaderas', '{S,M,L,XL,XXL}', 14, '#a8a29e'),
  ('pantalon-chino-beige', 'Pantalón chino beige', 'Sarga de algodón con un 2% de elastano. Corte recto ligeramente afilado en el tobillo.', 5990, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1400&q=80&auto=format&fit=crop', 'pantalones', '{38,40,42,44,46}', 20, '#d6c7a8'),
  ('vaquero-recto-indigo', 'Jean recto índigo', 'Denim de 13 oz teñido en índigo. Cinco bolsillos, remaches de cobre, tiro medio.', 7990, 'https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?w=1400&q=80&auto=format&fit=crop', 'pantalones', '{38,40,42,44,46,48}', 16, '#2b4a6f'),
  ('pantalon-lino-arena', 'Pantalón de lino arena', 'Lino europeo lavado a piedra. Cintura elástica parcial. Para los meses en los que sobra todo lo demás.', 6490, 'https://images.unsplash.com/photo-1715233749622-3216fe49e682?w=1400&q=80&auto=format&fit=crop', 'pantalones', '{S,M,L,XL}', 12, '#e0d5c3'),
  ('chaqueta-vaquera-clasica', 'Campera de jean clásica', 'Trucker de denim rígido que se moldea con el uso. Botones de presión y dos bolsillos de pecho.', 8990, 'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=1400&q=80&auto=format&fit=crop', 'chaquetas', '{S,M,L,XL}', 10, '#3a5a80'),
  ('bomber-tecnica-negra', 'Bomber técnica negra', 'Nylon repelente al agua, forro ligero y puños elásticos. Silueta corta y limpia.', 11900, 'https://images.unsplash.com/photo-1602525582399-7ef5f604ff7e?w=1400&q=80&auto=format&fit=crop', 'chaquetas', '{S,M,L,XL}', 8, '#111113'),
  ('vestido-midi-punto', 'Vestido midi de punto', 'Punto fino de viscosa con caída fluida. Largo midi y manga tres cuartos.', 7490, 'https://images.unsplash.com/photo-1759229874810-26aa9a3dda92?w=1400&q=80&auto=format&fit=crop', 'vestidos', '{XS,S,M,L}', 11, '#7d5a6b'),
  ('vestido-camisero-oliva', 'Vestido camisero oliva', 'Tencel con tacto seda. Botonadura completa y cinturón del mismo tejido.', 8490, 'https://images.unsplash.com/photo-1690233500831-4ba1fd211ed4?w=1400&q=80&auto=format&fit=crop', 'vestidos', '{XS,S,M,L,XL}', 9, '#6b6f4a')
on conflict (slug) do nothing;

-- Promociones de arranque. Va como update y no como parte del insert de arriba:
-- ese insert lleva "on conflict do nothing" y no tocaría un catálogo ya sembrado.
update products set sale_price_cents = 4990 where slug = 'hoodie-gris-jaspeado';
update products set sale_price_cents = 5990 where slug = 'vestido-camisero-oliva';
update products set sale_price_cents = 2490 where slug = 'camiseta-rayas-marineras';

-- Novedades de la casa. Fotos reaprovechadas del catálogo hasta que haya propias.
insert into news (slug, title, excerpt, image_url, href, published_at) values
  ('lino-primavera', 'El lino de primavera ya está en el taller', 'Primer corte del lino europeo lavado a piedra: llega al catálogo en tres semanas.', 'https://images.unsplash.com/photo-1715233749622-3216fe49e682?w=1400&q=80&auto=format&fit=crop', '/?categoria=pantalones', now()),
  ('visita-taller', 'Segunda visita del año a nuestro taller', 'Dos días revisando patrones y aprendiendo por qué una costura cae mal.', 'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=1400&q=80&auto=format&fit=crop', '/#taller', now() - interval '9 days'),
  ('devoluciones-30-dias', 'Ampliamos las devoluciones a 30 días', 'Sin explicaciones y con la etiqueta puesta. El envío de vuelta lo pagamos nosotros.', 'https://images.unsplash.com/photo-1526476148966-98bd039463ea?w=1400&q=80&auto=format&fit=crop', '/?categoria=sudaderas', now() - interval '24 days')
on conflict (slug) do nothing;

-- El insert de arriba mete las 13 filas en una sola sentencia, así que todas nacen
-- con el mismo created_at (now() es fijo por transacción). Con la fecha empatada,
-- "order by created_at" cae al orden físico de las filas y cualquier UPDATE posterior
-- reordena la portada: "recién ingresado" acabaría siendo una fila al azar.
-- Las escalonamos por orden de alta para que lo más reciente lo sea de verdad.
update products p
set created_at = now() - ((13 - s.ord) * interval '3 days')
from unnest(array[
  'camiseta-algodon-organico','camiseta-rayas-marineras','camiseta-oversize-negra',
  'sudadera-capucha-crema','sudadera-cuello-redondo-verde','hoodie-gris-jaspeado',
  'pantalon-chino-beige','vaquero-recto-indigo','pantalon-lino-arena',
  'chaqueta-vaquera-clasica','bomber-tecnica-negra','vestido-midi-punto',
  'vestido-camisero-oliva'
]) with ordinality as s(slug, ord)
where p.slug = s.slug;
