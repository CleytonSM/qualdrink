create table public.ingredients (
  id text primary key,
  name text not null,
  name_folded text not null,
  category text not null check (
    category in ('destilado', 'citrico', 'mixer', 'adocante', 'fruta', 'outro')
  )
);

create table public.drinks (
  id text primary key,
  name text not null,
  name_folded text not null,
  category text not null check (
    category in ('brasileiro', 'classico', 'sem_alcool')
  ),
  description text not null,
  steps_json text not null,
  alcoholic boolean not null
);

create table public.drink_ingredients (
  drink_id text not null references public.drinks (id),
  ingredient_id text not null references public.ingredients (id),
  amount text not null,
  unit text not null,
  primary key (drink_id, ingredient_id)
);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  drink_id text not null references public.drinks (id),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, drink_id)
);

create index drink_ingredients_ingredient_idx
  on public.drink_ingredients (ingredient_id);
create index favorites_user_idx
  on public.favorites (user_id);

alter table public.ingredients enable row level security;
alter table public.drinks enable row level security;
alter table public.drink_ingredients enable row level security;
alter table public.favorites enable row level security;

create policy ingredients_select_authenticated
  on public.ingredients
  for select
  to authenticated
  using (true);

create policy drinks_select_authenticated
  on public.drinks
  for select
  to authenticated
  using (true);

create policy drink_ingredients_select_authenticated
  on public.drink_ingredients
  for select
  to authenticated
  using (true);

create policy favorites_select_own
  on public.favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy favorites_insert_own
  on public.favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy favorites_update_own
  on public.favorites
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.ingredients from anon, authenticated;
revoke all on table public.drinks from anon, authenticated;
revoke all on table public.drink_ingredients from anon, authenticated;
revoke all on table public.favorites from anon, authenticated;

grant select on table public.ingredients, public.drinks, public.drink_ingredients to authenticated;
grant select, insert, update on table public.favorites to authenticated;

insert into public.ingredients (id, name, name_folded, category) values
  ('cachaca', 'Cachaça', 'cachaca', 'destilado'),
  ('vodka', 'Vodka', 'vodka', 'destilado'),
  ('gin', 'Gin', 'gin', 'destilado'),
  ('rum', 'Rum', 'rum', 'destilado'),
  ('tequila', 'Tequila', 'tequila', 'destilado'),
  ('whisky', 'Whisky', 'whisky', 'destilado'),
  ('licor_laranja', 'Licor de laranja', 'licor de laranja', 'destilado'),
  ('campari', 'Campari', 'campari', 'destilado'),
  ('vermute_rosso', 'Vermute rosso', 'vermute rosso', 'destilado'),
  ('aperol', 'Aperol', 'aperol', 'destilado'),
  ('espumante', 'Espumante', 'espumante', 'destilado'),
  ('limao', 'Limão', 'limao', 'citrico'),
  ('laranja', 'Laranja', 'laranja', 'citrico'),
  ('agua_tonica', 'Água tônica', 'agua tonica', 'mixer'),
  ('agua_com_gas', 'Água com gás', 'agua com gas', 'mixer'),
  ('cola', 'Refrigerante de cola', 'refrigerante de cola', 'mixer'),
  ('ginger_beer', 'Ginger beer', 'ginger beer', 'mixer'),
  ('suco_cranberry', 'Suco de cranberry', 'suco de cranberry', 'mixer'),
  ('suco_abacaxi', 'Suco de abacaxi', 'suco de abacaxi', 'mixer'),
  ('leite_coco', 'Leite de coco', 'leite de coco', 'mixer'),
  ('acucar', 'Açúcar', 'acucar', 'adocante'),
  ('leite_condensado', 'Leite condensado', 'leite condensado', 'adocante'),
  ('hortela', 'Hortelã', 'hortela', 'outro'),
  ('gelo', 'Gelo', 'gelo', 'outro');

insert into public.drinks (
  id, name, name_folded, category, description, steps_json, alcoholic
) values
  ('caipirinha', 'Caipirinha', 'caipirinha', 'brasileiro', 'Cachaça com limão e açúcar, servida bem gelada.', '["Corte o limão em pedaços.","Macere o limão com o açúcar no copo.","Complete com cachaça e gelo."]', true),
  ('caipiroska', 'Caipiroska', 'caipiroska', 'classico', 'A mesma base da caipirinha, com vodka no lugar da cachaça.', '["Corte o limão em pedaços.","Macere o limão com o açúcar no copo.","Complete com vodka e gelo."]', true),
  ('mojito', 'Mojito', 'mojito', 'classico', 'Rum, hortelã e limão, completado com água com gás.', '["Macere o limão, a hortelã e o açúcar.","Junte o rum e o gelo.","Complete com água com gás."]', true),
  ('gin_tonica', 'Gin tônica', 'gin tonica', 'classico', 'Gin com água tônica e um corte de limão.', '["Encha o copo com gelo.","Adicione o gin e complete com água tônica.","Finalize com a fatia de limão."]', true),
  ('cuba_libre', 'Cuba libre', 'cuba libre', 'classico', 'Rum com refrigerante de cola e limão.', '["Encha o copo com gelo.","Adicione o rum e o limão.","Complete com refrigerante de cola."]', true),
  ('moscow_mule', 'Moscow mule', 'moscow mule', 'classico', 'Vodka com ginger beer e limão.', '["Encha o copo com gelo.","Adicione a vodka e o limão.","Complete com ginger beer."]', true),
  ('margarita', 'Margarita', 'margarita', 'classico', 'Tequila, licor de laranja e limão, servida gelada.', '["Junte tequila, licor de laranja e limão na coqueteleira com gelo.","Bata até gelar.","Sirva sem coar o gelo, ou coe se preferir o copo limpo."]', true),
  ('pina_colada', 'Piña colada', 'pina colada', 'classico', 'Rum batido com abacaxi e leite de coco.', '["Bata rum, suco de abacaxi, leite de coco e gelo.","Sirva em seguida."]', true),
  ('negroni', 'Negroni', 'negroni', 'classico', 'Partes iguais de gin, Campari e vermute rosso.', '["Junte gin, Campari e vermute no copo com gelo.","Mexa até gelar."]', true),
  ('aperol_spritz', 'Aperol spritz', 'aperol spritz', 'classico', 'Aperol com espumante e um pouco de água com gás.', '["Coloque gelo no copo.","Adicione Aperol e espumante.","Complete com água com gás."]', true),
  ('whisky_sour', 'Whisky sour', 'whisky sour', 'classico', 'Whisky, limão e açúcar. Esta versão não leva clara de ovo.', '["Bata whisky, limão e açúcar com gelo.","Sirva no copo."]', true),
  ('cosmopolitan', 'Cosmopolitan', 'cosmopolitan', 'classico', 'Vodka, licor de laranja, cranberry e limão.', '["Bata vodka, licor de laranja, suco de cranberry e limão com gelo.","Coe e sirva."]', true),
  ('mojito_sem_alcool', 'Mojito sem álcool', 'mojito sem alcool', 'sem_alcool', 'Hortelã, limão e água com gás, sem rum.', '["Macere o limão, a hortelã e o açúcar.","Junte o gelo.","Complete com água com gás."]', false),
  ('limonada_suica', 'Limonada suíça', 'limonada suica', 'sem_alcool', 'Limão batido com leite condensado e gelo.', '["Bata o limão, o leite condensado e o gelo.","Sirva em seguida."]', false);

insert into public.drink_ingredients (drink_id, ingredient_id, amount, unit) values
  ('caipirinha', 'cachaca', '50', 'ml'),
  ('caipirinha', 'limao', '1', 'unidade'),
  ('caipirinha', 'acucar', '2', 'colher de chá'),
  ('caipirinha', 'gelo', '1', 'copo'),
  ('caipiroska', 'vodka', '50', 'ml'),
  ('caipiroska', 'limao', '1', 'unidade'),
  ('caipiroska', 'acucar', '2', 'colher de chá'),
  ('caipiroska', 'gelo', '1', 'copo'),
  ('mojito', 'rum', '50', 'ml'),
  ('mojito', 'limao', '1', 'unidade'),
  ('mojito', 'hortela', '8', 'folhas'),
  ('mojito', 'acucar', '2', 'colher de chá'),
  ('mojito', 'agua_com_gas', '1', 'completar o copo'),
  ('mojito', 'gelo', '1', 'copo'),
  ('gin_tonica', 'gin', '50', 'ml'),
  ('gin_tonica', 'agua_tonica', '150', 'ml'),
  ('gin_tonica', 'limao', '1', 'fatia'),
  ('gin_tonica', 'gelo', '1', 'copo'),
  ('cuba_libre', 'rum', '50', 'ml'),
  ('cuba_libre', 'cola', '120', 'ml'),
  ('cuba_libre', 'limao', '1', 'fatia'),
  ('cuba_libre', 'gelo', '1', 'copo'),
  ('moscow_mule', 'vodka', '50', 'ml'),
  ('moscow_mule', 'ginger_beer', '120', 'ml'),
  ('moscow_mule', 'limao', '0,5', 'unidade'),
  ('moscow_mule', 'gelo', '1', 'copo'),
  ('margarita', 'tequila', '50', 'ml'),
  ('margarita', 'licor_laranja', '20', 'ml'),
  ('margarita', 'limao', '30', 'ml'),
  ('margarita', 'gelo', '1', 'copo'),
  ('pina_colada', 'rum', '50', 'ml'),
  ('pina_colada', 'suco_abacaxi', '90', 'ml'),
  ('pina_colada', 'leite_coco', '30', 'ml'),
  ('pina_colada', 'gelo', '1', 'copo'),
  ('negroni', 'gin', '30', 'ml'),
  ('negroni', 'campari', '30', 'ml'),
  ('negroni', 'vermute_rosso', '30', 'ml'),
  ('negroni', 'gelo', '1', 'copo'),
  ('aperol_spritz', 'aperol', '60', 'ml'),
  ('aperol_spritz', 'espumante', '90', 'ml'),
  ('aperol_spritz', 'agua_com_gas', '30', 'ml'),
  ('aperol_spritz', 'gelo', '1', 'copo'),
  ('whisky_sour', 'whisky', '50', 'ml'),
  ('whisky_sour', 'limao', '25', 'ml'),
  ('whisky_sour', 'acucar', '1', 'colher de chá'),
  ('whisky_sour', 'gelo', '1', 'copo'),
  ('cosmopolitan', 'vodka', '40', 'ml'),
  ('cosmopolitan', 'licor_laranja', '15', 'ml'),
  ('cosmopolitan', 'suco_cranberry', '30', 'ml'),
  ('cosmopolitan', 'limao', '15', 'ml'),
  ('cosmopolitan', 'gelo', '1', 'copo'),
  ('mojito_sem_alcool', 'limao', '1', 'unidade'),
  ('mojito_sem_alcool', 'hortela', '8', 'folhas'),
  ('mojito_sem_alcool', 'acucar', '2', 'colher de chá'),
  ('mojito_sem_alcool', 'agua_com_gas', '1', 'completar o copo'),
  ('mojito_sem_alcool', 'gelo', '1', 'copo'),
  ('limonada_suica', 'limao', '2', 'unidades'),
  ('limonada_suica', 'leite_condensado', '3', 'colheres de sopa'),
  ('limonada_suica', 'gelo', '1', 'copo');
