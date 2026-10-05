-- Títulos de hasta 10 palabras (antes 5).
alter table pieces drop constraint if exists pieces_title_check;
alter table pieces add constraint pieces_title_check
  check (array_length(regexp_split_to_array(btrim(title), '\s+'), 1) <= 10);
