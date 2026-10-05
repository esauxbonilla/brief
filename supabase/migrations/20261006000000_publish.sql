-- Publicar: la agencia entrega el final (link de Drive) y el texto; el cliente
-- lo sube a su cuenta el día de publicación y lo marca como publicado.
alter table pieces add column if not exists final_url text;
alter table pieces add column if not exists caption text;
alter table pieces add column if not exists published_at timestamptz;

-- "Ya lo publiqué" / Deshacer. Solo piezas listas (o publicadas por el cliente).
create or replace function client_set_published(pid uuid, published boolean) returns piece_status
language plpgsql security definer set search_path = public as $$
declare p pieces;
begin
  p := assert_client_piece(pid);
  if p.channel = 'extra' then return p.status; end if;
  if published then
    if p.status <> 'listo' then return p.status; end if;
    update pieces set status = 'publicado', published_at = now() where id = pid;
    return 'publicado';
  end if;
  if p.status <> 'publicado' or p.published_at is null then return p.status; end if;
  update pieces set status = 'listo', published_at = null where id = pid;
  return 'listo';
end $$;

revoke execute on function client_set_published from anon;
