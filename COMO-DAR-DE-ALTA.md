# Cómo dar de alta clientes, equipo y agencias

Todo se hace en Supabase, en el **SQL Editor**:
Supabase → tu proyecto → **SQL Editor** → **New query** → pegas el SQL → **Run**.

En cada SQL cambia lo que está entre comillas (`'Nombre'`, `'cliente@email.com'`, etc.).

---

## Cómo funciona el login

- Se entra en **briefops.vercel.app** con email y contraseña.
- **La primera vez**, la contraseña que escribas se queda como la tuya.
- La app sabe quién es quién por el email:
  - Si eres de la agencia, entras al **panel**.
  - Si eres cliente, entras a **tu calendario**.
  - Si no estás dado de alta, no entras.

---

## 1. Agregar un cliente nuevo

**Paso 1.** Corre esto en el SQL Editor:

```sql
insert into clients (agency_id, name, initials, email)
select id, 'Nombre Apellido', 'NA', 'cliente@email.com'
from agencies where name = 'Shadow Ops';
```

- `initials`: las 2 letras que salen en su bolita.
- El email va en minúsculas.

**Paso 2.** Mándale al cliente:
- El link: **briefops.vercel.app**
- Su email
- Que la primera vez escriba la contraseña que quiera y esa se le queda.

> Si quieres darle tú la contraseña: entra tú primero con su email y la contraseña que elijas (en una ventana de incógnito), cierra sesión y pásale los datos.

**Avísale que entre pronto:** mientras nadie haya entrado con ese email, cualquiera que lo conozca puede quedarse con la cuenta.

---

## 2. Agregar a alguien de tu equipo (agencia)

**Paso 1. Crearle usuario.** En Supabase → **Authentication** → **Users** → **Add user** → **Create new user**:
- Email: el de tu compañero
- Password: cualquiera (no se la des, no la va a usar)
- Marca **Auto Confirm User**
- **Create user**

**Paso 2. Meterlo a la agencia.** En el SQL Editor:

```sql
insert into agency_members (agency_id, user_id)
select a.id, u.id
from agencies a, auth.users u
where a.name = 'Shadow Ops' and u.email = 'companero@email.com';
```

Debe decir **1 row affected**. Si dice 0, revisa que el email esté igual que en el paso 1.

**Paso 3.** Mándale el link **briefops.vercel.app**: entra con su email y la contraseña que quiera la primera vez.

---

## 3. Otra agencia o marca (en la misma app)

Cada agencia ve solo sus clientes y sus piezas.

**Paso 1. Crear la agencia:**

```sql
insert into agencies (name, initials) values ('Nombre Agencia', 'NA');
```

**Paso 2.** Agrega sus miembros (sección 2) y sus clientes (sección 1) poniendo `where name = 'Nombre Agencia'` en lugar de `'Shadow Ops'`.

> Ojo: si una misma persona está en dos agencias, el panel solo le muestra la primera.

## Otro proyecto totalmente aparte (otra app)

Eso es otro proyecto de Supabase y otro de Vercel, con sus propias claves. No se hace con SQL; pídelo aparte.

---

## Recuperar una contraseña olvidada

Las contraseñas se guardan en Supabase **cifradas**: nadie puede verlas, ni tú desde el panel de Supabase. No se recuperan, **se cambian por una nueva**. Sirve igual para ti, alguien de tu equipo o un cliente.

**Paso 1.** En el SQL Editor, con el email de la persona:

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data - 'password_set'
where email = 'persona@email.com';
```

Debe decir **1 row affected**. Si dice 0, el email está mal escrito.

**Paso 2.** La persona entra a **briefops.vercel.app** con su email y una contraseña nueva. Esa se queda como la suya.

Que entre luego luego: mientras no entre, cualquiera que conozca su email puede poner la contraseña.

---

## Problemas comunes

### "Ese email no está dado de alta"
El email no está en `clients` ni en la agencia. Revisa que esté bien escrito:

```sql
select name, email from clients;
```

### "Contraseña incorrecta"
Ya tiene contraseña y la escribió mal. Si no la recuerda, ve a **Recuperar una contraseña olvidada**.

### "Falta SUPABASE_SERVICE_ROLE_KEY en Vercel"
Vercel → tu proyecto → **Settings** → **Environment Variables**:
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: tu clave secreta (Supabase → **Project Settings** → **API Keys** → **Secret keys**, empieza con `sb_secret_`)

Guarda y luego **Deployments** → el último → **⋯** → **Redeploy**.

---

## Quitar acceso

**Cliente** (borra también sus piezas):

```sql
delete from clients where email = 'cliente@email.com';
```

**Alguien del equipo:**

```sql
delete from agency_members
where user_id = (select id from auth.users where email = 'companero@email.com');
```

Para borrar su cuenta por completo: **Authentication** → **Users** → busca el email → **⋯** → **Delete user**.
