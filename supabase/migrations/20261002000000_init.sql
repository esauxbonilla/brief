-- Calendario de contenido · esquema inicial
-- Cada pieza tiene DOS fechas: publish_at (sale al mundo) y record_due_at
-- (cuándo se necesita grabado). El cliente solo ve record_due_at.

create extension if not exists pgcrypto;

create type channel as enum ('reel', 'story', 'lead', 'carrusel');
create type piece_status as enum ('borrador', 'grabar', 'rehacer', 'grabado', 'edicion', 'listo', 'publicado', 'cancelado');

create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  initials text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Usuarios de la agencia (panel).
create table agency_members (
  agency_id uuid not null references agencies on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (agency_id, user_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies on delete cascade,
  name text not null,
  initials text not null,
  avatar_url text,
  phone text,                                   -- WhatsApp
  email text unique,                            -- para el magic link
  tz text not null default 'America/Mexico_City',
  user_id uuid unique references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table pieces (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  channel channel not null,
  title text not null check (array_length(regexp_split_to_array(btrim(title), '\s+'), 1) <= 5),
  status piece_status not null default 'borrador',
  format text,
  objective text,
  hook text,
  notes text[] not null default '{}',
  publish_at timestamptz not null,
  record_due_at timestamptz not null,
  edit_days int not null default 3 check (edit_days >= 0),
  brief_sent_at timestamptz,
  redo_reason text,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint redo_needs_reason check (status <> 'rehacer' or coalesce(btrim(redo_reason), '') <> '')
);
create index pieces_client_due on pieces (client_id, record_due_at);

create table script_blocks (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references pieces on delete cascade,
  position int not null,
  label text not null,
  duration text,
  lines text[] not null default '{}',
  note text,
  recorded boolean not null default false
);
create index script_blocks_piece on script_blocks (piece_id, position);

create table shots (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references pieces on delete cascade,
  position int not null,
  text text not null,
  done boolean not null default false
);
create index shots_piece on shots (piece_id, position);

-- "references" es palabra reservada en Postgres: la tabla se llama piece_references.
create table piece_references (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references pieces on delete cascade,
  block_id uuid references script_blocks on delete set null,
  image_url text,
  title text not null,
  note text,
  requested_from_client boolean not null default false,
  uploaded_url text
);
create index piece_references_piece on piece_references (piece_id);

create table uploads (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references pieces on delete cascade,
  file_url text not null,
  file_name text not null default '',
  uploaded_at timestamptz not null default now()
);
create index uploads_piece on uploads (piece_id);

-- Cola de avisos (WhatsApp/push). Un envío diario por cliente junta los pendientes.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  kind text not null,          -- brief | reminder | overdue | redo
  piece_id uuid references pieces on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_pending on notifications (client_id) where sent_at is null;

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger pieces_touch before update on pieces for each row execute function touch_updated_at();

-- ── Helpers para RLS ────────────────────────────────────────────────────────

create function my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from clients where user_id = auth.uid()
$$;

create function is_agency_member(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from agency_members where agency_id = a and user_id = auth.uid())
$$;

create function agency_owns_client(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clients cl join agency_members m on m.agency_id = cl.agency_id
    where cl.id = c and m.user_id = auth.uid()
  )
$$;

create function client_visible(p pieces) returns boolean
language sql stable as $$
  select p.brief_sent_at is not null and p.status not in ('borrador', 'cancelado')
$$;

create function can_see_piece(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pieces p
    where p.id = pid
      and ((p.client_id = my_client_id() and client_visible(p)) or agency_owns_client(p.client_id))
  )
$$;

create function agency_owns_piece(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pieces p where p.id = pid and agency_owns_client(p.client_id))
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table agencies enable row level security;
alter table agency_members enable row level security;
alter table clients enable row level security;
alter table pieces enable row level security;
alter table script_blocks enable row level security;
alter table shots enable row level security;
alter table piece_references enable row level security;
alter table uploads enable row level security;
alter table notifications enable row level security;

create policy agencies_read on agencies for select
  using (is_agency_member(id) or id = (select agency_id from clients where id = my_client_id()));

create policy members_read on agency_members for select using (user_id = auth.uid());

create policy clients_read on clients for select
  using (user_id = auth.uid() or is_agency_member(agency_id));
create policy clients_agency_write on clients for all
  using (is_agency_member(agency_id)) with check (is_agency_member(agency_id));

-- El cliente solo ve sus piezas con brief enviado; la agencia ve todas las suyas.
create policy pieces_client_read on pieces for select
  using (client_id = my_client_id() and client_visible(pieces));
create policy pieces_agency_all on pieces for all
  using (agency_owns_client(client_id)) with check (agency_owns_client(client_id));

create policy blocks_read on script_blocks for select using (can_see_piece(piece_id));
create policy blocks_agency on script_blocks for all using (agency_owns_piece(piece_id)) with check (agency_owns_piece(piece_id));

create policy shots_read on shots for select using (can_see_piece(piece_id));
create policy shots_agency on shots for all using (agency_owns_piece(piece_id)) with check (agency_owns_piece(piece_id));

create policy refs_read on piece_references for select using (can_see_piece(piece_id));
create policy refs_agency on piece_references for all using (agency_owns_piece(piece_id)) with check (agency_owns_piece(piece_id));

create policy uploads_read on uploads for select using (can_see_piece(piece_id));
create policy uploads_agency on uploads for all using (agency_owns_piece(piece_id)) with check (agency_owns_piece(piece_id));

create policy notifications_agency on notifications for all
  using (agency_owns_client(client_id)) with check (agency_owns_client(client_id));

-- ── Acciones del cliente ────────────────────────────────────────────────────
-- El cliente no escribe tablas directamente: solo estas funciones, que validan
-- que la pieza es suya, visible, y que la transición de estado es válida.

create function assert_client_piece(pid uuid, pending_only boolean default false) returns pieces
language plpgsql stable security definer set search_path = public as $$
declare p pieces;
begin
  select * into p from pieces where id = pid and client_id = my_client_id() and client_visible(pieces);
  if not found then raise exception 'pieza no encontrada' using errcode = '42501'; end if;
  if pending_only and p.status not in ('grabar', 'rehacer') then
    raise exception 'la pieza no está pendiente de grabar' using errcode = '22023';
  end if;
  return p;
end $$;

-- "Ya lo grabé" / Deshacer.
create function client_set_recorded(pid uuid, recorded boolean) returns piece_status
language plpgsql security definer set search_path = public as $$
declare p pieces; next_status piece_status;
begin
  p := assert_client_piece(pid);
  if recorded then
    if p.status not in ('grabar', 'rehacer') then return p.status; end if;
    next_status := 'grabado';
  else
    if p.status <> 'grabado' or p.received_at is not null then return p.status; end if;
    next_status := case when p.redo_reason is not null then 'rehacer' else 'grabar' end;
  end if;
  update pieces set status = next_status where id = pid;
  return next_status;
end $$;

create function client_toggle_shot(sid uuid, value boolean) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select piece_id into pid from shots where id = sid;
  perform assert_client_piece(pid, true);
  update shots set done = value where id = sid;
end $$;

create function client_toggle_block(bid uuid, value boolean) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select piece_id into pid from script_blocks where id = bid;
  perform assert_client_piece(pid, true);
  update script_blocks set recorded = value where id = bid;
end $$;

-- Registra material subido a Storage y pasa la pieza a "grabado".
create function client_add_upload(pid uuid, path text, name text) returns uploads
language plpgsql security definer set search_path = public as $$
declare p pieces; u uploads;
begin
  p := assert_client_piece(pid);
  if path not like (p.client_id::text || '/' || pid::text || '/%') then
    raise exception 'ruta de archivo no válida' using errcode = '22023';
  end if;
  insert into uploads (piece_id, file_url, file_name) values (pid, path, name) returning * into u;
  if p.status in ('grabar', 'rehacer') then update pieces set status = 'grabado' where id = pid; end if;
  return u;
end $$;

create function client_upload_reference(rid uuid, path text) returns void
language plpgsql security definer set search_path = public as $$
declare r piece_references; p pieces;
begin
  select * into r from piece_references where id = rid and requested_from_client;
  if not found then raise exception 'referencia no encontrada' using errcode = '42501'; end if;
  p := assert_client_piece(r.piece_id);
  if path not like (p.client_id::text || '/' || p.id::text || '/%') then
    raise exception 'ruta de archivo no válida' using errcode = '22023';
  end if;
  update piece_references set uploaded_url = path where id = rid;
end $$;

-- Vincula el usuario autenticado con su ficha de cliente por email (primer login).
create function claim_client() returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  update clients set user_id = auth.uid()
  where user_id is null and lower(email) = lower(auth.jwt() ->> 'email')
  returning id into cid;
  return coalesce(cid, my_client_id());
end $$;

revoke execute on function client_set_recorded, client_toggle_shot, client_toggle_block, client_add_upload, client_upload_reference, claim_client from anon;

-- ── Storage ─────────────────────────────────────────────────────────────────
-- material: privado, ruta {client_id}/{piece_id}/{archivo} (también las fotos que pide la agencia)
-- referencias: lectura pública (imágenes del brief), escritura agencia

insert into storage.buckets (id, name, public) values ('material', 'material', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('referencias', 'referencias', true) on conflict do nothing;

create policy material_client_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'material' and (storage.foldername(name))[1] = my_client_id()::text);
create policy material_read on storage.objects for select to authenticated
  using (bucket_id = 'material' and (
    (storage.foldername(name))[1] = my_client_id()::text
    or agency_owns_client(((storage.foldername(name))[1])::uuid)
  ));
create policy referencias_agency_write on storage.objects for insert to authenticated
  with check (bucket_id = 'referencias' and exists (select 1 from agency_members where user_id = auth.uid()));
