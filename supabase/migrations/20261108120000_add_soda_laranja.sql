insert into public.drinks (
  id, name, name_folded, category, description, steps_json, alcoholic
) values (
  'soda_laranja',
  'Soda de laranja',
  'soda de laranja',
  'sem_alcool',
  'Suco de laranja com água com gás e gelo.',
  '["Encha o copo com gelo.","Adicione o suco de laranja.","Complete com água com gás e misture delicadamente."]',
  false
);

insert into public.drink_ingredients (drink_id, ingredient_id, amount, unit) values
  ('soda_laranja', 'laranja', '150', 'ml de suco'),
  ('soda_laranja', 'agua_com_gas', '100', 'ml'),
  ('soda_laranja', 'gelo', '1', 'copo');
