-- Carpeta de Drive donde cada cliente sube su material (los videos ya no se suben a la app).
alter table clients add column if not exists drive_url text;
