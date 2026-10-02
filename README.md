# Calendario de contenido

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # lógica de fechas, urgencia, reglas de piezas, parser de guion, avisos
```

**Sin variables de entorno arranca en modo demo**: datos de ejemplo en memoria con fechas relativas a hoy, sin login. Cliente en `/`, agencia en `/agencia`. El modo demo es solo para probar: en Vercel cada instancia tiene su propia memoria y se reinicia.

### Producción (Supabase + Vercel)
1. Crea un proyecto en Supabase y aplica `supabase/migrations/` (`supabase db push`, o pega el SQL en el editor).
2. Opcional: `npm run seed:gen` y ejecuta `supabase/seed.sql` (cliente demo `marco@example.com`).
3. Auth → URL Configuration: añade `https://TU-DOMINIO/auth/callback` a Redirect URLs.
4. Da de alta a la agencia: inserta el usuario en `agency_members` (`agency_id`, `user_id` de `auth.users`).
5. Clientes: fila en `clients` con su `email`. En su primer login con magic link se vincula solo (`claim_client`).
6. Variables en Vercel: ver `.env.example` (Supabase, `CRON_SECRET`, WhatsApp). El cron diario está en `vercel.json` (15:00 UTC = 9:00 CDMX).

### Estructura
- `src/lib/dates.ts`, `src/lib/pieces.ts` — fechas en la zona horaria del cliente, urgencia, `atrasado` derivado, jerarquía visual.
- `src/lib/data/` — acceso a datos: `supabase.ts` (RLS + RPCs) y `demo.ts` (memoria), misma interfaz.
- `src/components/client/` — calendario escritorio, móvil, detalle (Brief/Guión/Referencias), sesión de grabación.
- `src/app/agencia/` — panel de la agencia.
- `supabase/migrations/` — esquema, RLS, funciones del cliente, buckets de Storage.

### Diferencias con el handoff
- La tabla `references` se llama `piece_references` (`references` es palabra reservada en Postgres).
- `clients` añade `email`, `tz` y `user_id`; `pieces` añade `notes`; `uploads` añade `file_name`; nueva tabla `notifications` (cola de avisos).
- La grilla mensual de escritorio usa `min-width: 880px` (no 1000) para que el panel de detalle quepa al lado en pantallas de 1440px.

---

# Handoff original: Calendario de contenido para clientes (coach fitness)

## Overview
App web para que el **cliente de una agencia de contenido** (un coach fitness, no técnico) entre y sepa en 5 segundos qué tiene que grabar esta semana. La agencia produce todo; el cliente solo graba material crudo y aprueba. La app la usa el cliente, no la agencia (la agencia necesita además un panel simple para cargar piezas y guiones — ver "Panel agencia").

Tres vistas diseñadas:
1. **Calendario mensual (escritorio)** — `designs/Calendario de Contenido.dc.html`
2. **Calendario móvil** con hoja inferior de detalle — `designs/Calendario Movil.dc.html`
3. **Guión + Referencias + Teleprompter (móvil)** — `designs/Guion y Referencias.dc.html`

## About the Design Files
Los archivos de `designs/` son **referencias de diseño hechas en HTML** (prototipos que muestran aspecto y comportamiento), **no código de producción**. Se abren directo en el navegador (necesitan `support.js` al lado). Toda la lógica está en la clase `Component` dentro de cada archivo (`renderVals()`), y los estilos están inline — úsalos como fuente de verdad de valores exactos.

La tarea es **recrearlos en un stack real**. Stack recomendado (no hay código previo):
- **Next.js (App Router) + TypeScript + Tailwind**
- **Supabase** (Postgres, Auth con magic link, Storage para imágenes y material grabado)
- Deploy en **Vercel**

## Fidelity
**High-fidelity.** Colores, tipografía, espaciado e interacciones son finales. Recrear pixel-perfect.

---

## Modelo de datos

> **Importante:** cada pieza tiene DOS fechas. La de publicación (`publish_at`) y la de grabación (`record_due_at`). **El calendario del cliente se ordena y se muestra por `record_due_at`**, no por la fecha de publicación. Si le enseñas la fecha de publicación, el cliente siempre va a entregar tarde. Los prototipos usan una sola fecha: en producción, esa fecha es `record_due_at`.

```
clients        id, name, initials, avatar_url, agency_id, phone (WhatsApp)
agencies       id, name, initials ("EN"), logo_url
pieces         id, client_id, channel, title, status, format, objective, hook,
               publish_at     timestamptz   -- cuándo sale al mundo
               record_due_at  timestamptz   -- cuándo se necesita grabado (lo que ve el cliente)
               edit_days      int           -- días que necesita el editor
               brief_sent_at  timestamptz   -- cuándo se envió el brief al cliente (null = borrador)
               redo_reason    text          -- motivo si status = 'rehacer'
               received_at    timestamptz   -- cuándo la agencia confirmó recepción del material
script_blocks  id, piece_id, position, label, duration, lines text[], note, recorded bool
shots          id, piece_id, position, text, done bool          -- checklist de tomas (brief)
references     id, piece_id, block_id?, image_url, title, note, requested_from_client bool, uploaded_url?
uploads        id, piece_id, file_url, uploaded_at
```
- `channel`: `reel | story | lead | carrusel`
- `status`: `borrador | grabar | rehacer | grabado | edicion | listo | publicado | cancelado`
- `record_due_at = publish_at − edit_days − buffer` (buffer por defecto 1 día). **Se calcula al crear la pieza**; el cliente nunca lo piensa.
- **Estado derivado `atrasado`** (no se guarda, no lo elige nadie): `status IN ('grabar','rehacer') AND now() > record_due_at`.
- **Responsable** se deriva: `status === 'grabar'` → cliente; cualquier otro → agencia.
- `title` máximo 5 palabras (validar en el panel de la agencia).
- RLS: un cliente solo ve sus `pieces`.

## Reglas de negocio clave
- **Visibilidad**: el cliente solo ve piezas con `brief_sent_at` no nulo y `status ≠ borrador/cancelado`. **Nada aparece en su calendario hasta que la agencia manda el brief.** Así la agencia controla la anticipación (si quiere que grabe el 8, el brief sale el 1).
- **"Esta semana"** = lunes a domingo de la semana actual (semana empieza en lunes).
- **Contador del header**: piezas con `status IN (grabar, rehacer)` cuyo `record_due_at` cae en esta semana.
- **Urgencia como tiempo restante, no como fecha** (mismo dato, se siente distinto):
  - más de 3 días → "Para el sábado 3" — tono tranquilo, gris (`#B5B8BE`)
  - 2–3 días → "En 2 días" — ámbar (`#F5B83D`)
  - hoy / mañana → "Hoy antes de las 20:00" / "Mañana antes de las 20:00" — ámbar sólido (fondo `#F5B83D`, texto `#1A1205`)
  - vencido → "Venció hace 2 días" — rojo (`#FF5C5C`)
  Aplica al bloque del header, a las cards y al detalle.
- **Fecha de publicación** solo como contexto, abajo y pequeña en el detalle: "Se publica el 15 oct" (12px `#7C8087`).
- **Jerarquía visual crítica**: piezas `grabar` de esta semana destacan sobre todo; `grabar` de semanas futuras destacan menos; todo lo demás es contexto secundario.
- **Filtros por canal**: no ocultan; las piezas de otros canales bajan a `opacity: 0.25` (transición 200ms).
- "Ya lo grabé" / subir material → `status = grabado` (con toast "Deshacer" 3.5 s en móvil).

### Atrasado
- Rompe la jerarquía ámbar: **rojo `#FF5C5C`**. Card: bg `#2A1214`, border `1px #FF5C5C`, pill sólida rojo con texto `#1A0506`, texto "Venció hace N días".
- Las piezas atrasadas suben a una **franja fija arriba del calendario, encima del bloque "esta semana"** (sticky, no se puede scrollear fuera de vista). Título: "Atrasadas: N piezas" + lista compacta tappable.
- **Panel agencia**: en cada pieza atrasada, botones **Reprogramar** (mueve `publish_at` y recalcula `record_due_at`) y **Cancelar** (`status = cancelado`, desaparece para el cliente). Sin esto el calendario se llena de "zombies rojos" y el cliente deja de hacerles caso.

### Rehacer (rechazo de material)
- La agencia puede devolver una pieza grabada: `status = rehacer` + `redo_reason` obligatorio.
- Vuelve a la lista del cliente con estilo de acción (ámbar, o rojo si ya venció), pill "Rehacer" y el motivo visible arriba del brief, en un recuadro: "Hay que repetirlo: {motivo}".
- Cuenta como pendiente en el header.

### Confirmación de recepción
- Tras subir material, el cliente ve "Subiendo…" → "Recibido ✓" (verde `#4FD98A`) con hora. Si la subida falla: "No se pudo subir. Reintentar".
- Opcional: la agencia marca `received_at` ("Revisado por la agencia ✓").

### Avisos (WhatsApp o push)
| Momento | Qué pasa | Aviso |
|---|---|---|
| `publish_at − 10 días` | Se crea en `borrador`; el cliente no la ve | — |
| `brief_sent_at` | Aparece en su calendario | "Nuevo brief: 3 piezas para grabar antes del 8" (agrupar las piezas enviadas el mismo día) |
| `record_due_at − 2 días` | Recordatorio | "Te faltan 2 piezas, vencen pasado mañana" |
| `record_due_at` pasado | `atrasado` | Franja roja + "Tienes 1 pieza atrasada" |
| `status → rehacer` | Devuelta | "Hay que repetir «{título}»: {motivo}" |

Un solo mensaje al día como máximo por cliente (juntar avisos).

---

## Design Tokens

### Tipografía
- **Geist** (400/500/600/700) para todo; **Geist Mono** (500) para micro-etiquetas/logo agencia. Google Fonts.
- `-webkit-font-smoothing: antialiased`. Títulos con `letter-spacing: -0.015em/-0.02em`. `text-wrap: pretty` en títulos de cards; **nunca truncar ni partir palabras** (sin `line-clamp`, sin `word-break`).

### Colores — base
| Token | Hex |
|---|---|
| page bg (exterior) | `#070708` / móvil `#050506` |
| surface (frame/calendario) | `#0B0B0D` |
| card | `#141518` |
| sheet/panel | `#111214` / móvil `#121315` |
| surface-2 | `#16171A`, `#18191C`, `#1B1C1F` |
| hairline | `rgba(255,255,255,0.05)` – `0.08` |
| botón borde | `rgba(255,255,255,0.10–0.14)` |
| text | `#E8E9EB` |
| text-strong | `#FFFFFF`, `#F2F3F5` |
| text-2 | `#D4D6DA`, `#C9CCD1`, `#B5B8BE` |
| text-3 (labels) | `#7C8087` |
| text-4 (vacío/off) | `#5E6168`, `#45484E`, `#3A3D42` |

### Canal (barra 3px a la izquierda de cada card)
| Canal | Hex |
|---|---|
| Reels | `#FF4F8B` |
| Stories | `#2BD4F0` |
| Lead Magnets | `#FF8B3D` |
| Carruseles | `#A6E83A` |

### Estado (pill)
| Estado | Color texto | Fondo pill |
|---|---|---|
| Por grabar | `#F5B83D` | `#F5B83D1F` (o sólido si es de esta semana, texto `#1A1205`) |
| Grabado | `#6FA8FF` | `#6FA8FF1F` |
| En edición | `#B990FF` | `#B990FF1F` |
| Listo | `#4FD98A` | `#4FD98A1F` |
| Publicado | `#7C8087` | `rgba(255,255,255,0.05)` |
| Rehacer | `#F5B83D` | sólido como "Por grabar" |
| Atrasado (derivado) | `#FF5C5C` | sólido rojo, texto `#1A0506` |

### Ámbar "acción" (Por grabar)
- Card esta semana: bg `#2A2110`, border `1px #F5B83D`, shadow `0 0 0 3px rgba(245,184,61,0.12), 0 6px 18px rgba(0,0,0,0.4)`, título `#FFF4DE` 600.
- Card futura: bg `#19160F`, border `rgba(245,184,61,0.4)`, título `#E6DFD0` 600.
- Card contexto: bg `#141518`, border `rgba(255,255,255,0.04)`, título `#9DA1A8` 500 (publicado `#62666D`).
- Bloque header "esta semana": bg `#231B0B`, border `1px #F5B83D`, número `#F5B83D` 34px/700 (móvil 40px), texto `#F2DDB0` / `#FFF4DE`.
- Botón primario: bg `#F5B83D` (hover `#FFC85A`), texto `#1A1205` 600.
- Celdas de la semana actual (escritorio): bg `#110F0A`.

### Responsable
- Cliente: círculo 18px (móvil 20px) `#E9D3A8`, iniciales `#2A1F0C` 8px/700 ("MR").
- Agencia: cuadrado 18px radio 4 `#24262B`, Geist Mono 8px `#8A8D93` ("EN").

### Radios
cards 6px (escritorio) / 12px (móvil) · chips 999px · botones 8–10px (móvil 14px) · frame 14px · sheet 24px top · bloques guión 14px.

### Espaciado
Escala usada: 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24 · 28.

---

## Screens

### 1. Calendario mensual (escritorio)
- Frame `max-width:1440px`, radius 14, border hairline. Lado derecho: panel de detalle `420px` sticky (`top:28px`). Ambos en flex-wrap, gap 28.
- **Header (sticky top:0)**, padding `22px 24px 16px`:
  - Izquierda: subtítulo 12px `#7C8087` ("Marco Ruiz · Calendario de contenido · con Estudio Norte"); mes 30px/600; flechas 34×34 radius 8 bg `#141518`; botón "Hoy".
  - Derecha: bloque ámbar "Lo que tienes que grabar esta semana" + "**N** piezas" + "Entrega: antes del …" + botón "Ver brief" (abre la primera pieza pendiente).
- **Fila de filtros**: chips altura 32, padding 0 14, dot 8px del color de canal. Activo: fondo = color del canal, texto `#0B0B0D` 600, dot `#0B0B0D`. "Todo" usa `#E8E9EB`. A la derecha, leyenda de estados (dot 7px + nombre 12px).
- **Grid**: 7 columnas `minmax(0,1fr)`, `gap:1px` sobre fondo hairline (líneas de 1px), radius 10. `min-width:1000px` con scroll horizontal debajo de eso. Encabezados LUN…DOM 11px uppercase `letter-spacing:0.08em` `#5E6168`.
- **Celda**: min-height 136, padding 8, gap 6. Número 12px `#8A8D93`; fuera de mes `#3A3D42` y cards a opacity 0.55; hoy = número en pill `#E8E9EB` texto oscuro + "Hoy". **Celda vacía = solo el número tenue**, sin bordes ni fondo extra.
- **Card**: flex; barra 3px canal; contenido padding `7px 8px 7px 9px`, gap 7; título 13px/1.25; fila pill + responsable con `flex-wrap:wrap` (el avatar baja si no cabe). Pill 11px/600 padding `2px 7px`. Seleccionada: border `#FFFFFF`.
- **Panel detalle**: barra 4px canal; canal + pill; título 24px/600; responsable ("Te toca a ti grabarlo" / "Lo tiene Estudio Norte"); grid 2 cols (fecha / formato); "Para qué sirve"; "Primera frase a cámara" 15px/500 blanco; checklist de tomas (checkbox 18px radius 5, borde `#5E6168`, marcado `#F5B83D` + ✓, texto tachado); "Ten en cuenta"; stepper de 5 segmentos (3px) del flujo de estados; botones "Subir material" (primario) y "Ya lo grabé". Si es de la agencia: mensaje "No tienes que hacer nada con esta pieza…".

### 2. Calendario móvil (390 × 844)
- Scroll vertical único. Arriba (se va con scroll): "Hola, Marco", mes 26px/600 como botón con ▾ (rota 180° abierto), avatar 36px.
- **Mini mes desplegable** (max-height 0 → 380px, 320ms `cubic-bezier(.2,.8,.2,1)`): grid 7 cols, celdas 44px con hasta 3 dots de canal; días con "Por grabar" tienen `inset 0 0 0 1px rgba(245,184,61,.55)`. Tocar un día → va a esa semana y hace scroll suave hasta ese día.
- **Bloque "esta semana"** (toda la tarjeta es tappable → abre primera pendiente): número 40px, "Empezar", barra de progreso 4px (grabadas/total).
- **Sticky**: rango de semana ("Esta semana · 28 sep – 4 oct") con flechas 44px; tira de 7 días (botones 62px alto, radius 12, dots 5px); swipe horizontal >50px cambia de semana; chips con scroll horizontal (36px alto).
- Cambio de semana: lista hace fade out/in (opacity + translateY 6px, 160–220ms).
- **Lista por día**: label "jueves 1" 13px/600 capitalize + pill "Hoy"; día vacío = "· Nada programado" `#45484E` en una línea. Cards: radius 12, padding 12, canal 12px/600, título 16px, pill 12px, meta "0 de 5 tomas", chevron ›. `:active` → `scale(0.98)`.
- **Bottom sheet** (90% alto, radius 24 top): `translateY(105%)` ↔ `0`, 360ms `cubic-bezier(.2,.85,.25,1)`; backdrop `rgba(0,0,0,.6)` fade 300ms; arrastrar el handle hacia abajo (pointer events, sin transición mientras arrastra), suelta >110px cierra. Checklist con filas ≥52px, checkbox 24px. Barra de acciones fija abajo: "Ya lo grabé" / "Subir material" (52px).
- **Toast**: 52px, fondo `#E8E9EB`, entra desde abajo; "«Título» marcado como grabado" + "Deshacer".

### 4. Sesión de grabación (NUEVA — no diseñada, alta prioridad)
El cliente no graba una pieza por día: graba 6 de corrido un domingo. Esta es la vista que más se va a usar.
- Entrada: botón en el bloque "esta semana" → **"Grabar todo de corrido"** (y en la franja de atrasadas).
- Agrupa todas las piezas pendientes (`grabar` + `rehacer`, primero atrasadas, luego por `record_due_at`) en **una sola lista continua**.
- Por cada pieza: encabezado (canal, título, formato), referencias en miniatura, bloques del guión en texto grande (17–20px) y botón "Grabado" por bloque y por pieza.
- Progreso global arriba: "3 de 6 piezas". Al terminar: subir todo el material en lote.
- Seguir el estilo visual de la pantalla 3 (bloques de guión).

### 3. Guión + Referencias (móvil)
- Sheet con cabecera (canal, pill, título 21px, "Te toca a ti · antes del …") y **tabs segmentadas**: Brief · Guión · Referencias (contenedor `#1B1C1F` radius 11, tab activa `#2A2C31` blanco 600; badge ámbar con nº de referencias que requieren acción).
- **Guión**: resumen ("5 bloques · unos 50 s", "N de 5 grabados", barra 96px). Texto de ayuda "Graba cada bloque por separado…". Cada **bloque** (radius 14, padding 14, bg `#17181B`): nº en Geist Mono + LABEL uppercase 11px, duración; miniatura de referencia opcional (44×72) que abre el visor; líneas 17px/1.45/500; nota opcional; botón "Marcar como grabado" 44px → estado grabado (bg `#121A14`, borde `rgba(79,217,138,.35)`, texto `#7C8087`, botón "✓ Grabado" verde).
- CTA fijo: **"Leer mientras grabo"** → modo lectura.
- **Modo lectura (v1)**: pantalla completa negra, texto 31px/1.3/600 blanco, labels de bloque en ámbar, botón × para cerrar. **Scroll manual con el dedo.** Nada más.
- ⚠️ **Fuera de alcance para v1:** el teleprompter con autoscroll, velocidades variables y el cálculo del bloque actual por scroll (sí están en el prototipo `Guion y Referencias.dc.html`, pero **no implementarlos todavía**). Se deja para v2, cuando se compruebe que el flujo funciona.
- **Referencias**: (a) pedidos al cliente en ámbar ("Foto de Ramiro hace 3 meses" + pill "Envíala tú" + zona de subida punteada); (b) "De la agencia": imagen grande + título + nota + "Se usa en el bloque 1".
- **Visor de imagen**: pantalla completa negra, tap = zoom 2.2× con `transform-origin` en el punto tocado (300ms), botón × 44px.

---

## Panel agencia (no diseñado — implementar simple)
- CRUD de piezas por cliente (fecha, canal, título ≤5 palabras, estado, formato, objetivo, gancho, tomas).
- **Pegar guión desde Google Docs**: dividir automáticamente en bloques por encabezados (`Gancho`, `Problema`, `Solución`, `Prueba social`, `CTA`); cada párrafo = una línea.
- Subir referencias e indicar a qué bloque pertenecen; marcar si se le pide material al cliente.
- Al crear la pieza: elegir `publish_at` y `edit_days` → se calcula `record_due_at` (editable).
- Botón **"Enviar brief"** (uno o varios a la vez) → fija `brief_sent_at`, cambia a `grabar` y dispara el aviso. Advertir si el brief sale con menos anticipación de la necesaria.
- En material recibido: **Aprobar** (→ `edicion`) o **Pedir que lo repita** (→ `rehacer`, motivo obligatorio).
- En piezas atrasadas: **Reprogramar** o **Cancelar**.

## Plan sugerido para Claude Code (en orden)
1. Setup Next.js + Tailwind + Supabase; tokens de arriba en `tailwind.config`; fuentes Geist.
2. Esquema SQL (con `publish_at`, `record_due_at`, `edit_days`, `brief_sent_at`, estados `borrador/rehacer/cancelado`) + RLS + seed con los datos de ejemplo (arrays `ITEMS` y `BRIEFS` de los archivos; usa su fecha como `record_due_at`).
3. Lógica de fechas: estado derivado `atrasado` y textos de tiempo restante (con tests).
4. Vista mensual escritorio + franja de atrasadas.
5. Vista móvil responsive (breakpoint < 768px) con bottom sheet.
6. Tabs Guión / Referencias, modo lectura simple, visor de imágenes.
7. Subida de material a Storage + "Recibido ✓" + cambio a "Grabado".
8. Sesión de grabación.
9. Auth por magic link (cliente) y panel agencia (enviar brief, aprobar / rehacer, reprogramar / cancelar).
10. Avisos por WhatsApp/push.

**v2 (no ahora):** teleprompter con autoscroll y velocidades, importar directo desde Google Docs.

## Assets
- `designs/assets/ref-microlanzamiento.png` — imagen de referencia recortada de un Google Doc del usuario (ejemplo; en producción la sube la agencia).
- Avatares/logos son iniciales placeholder ("MR", "EN").
- Sin iconos externos (solo caracteres ‹ › ▾ ✓ ×).

## Files
- `designs/Calendario de Contenido.dc.html` — escritorio
- `designs/Calendario Movil.dc.html` — móvil
- `designs/Guion y Referencias.dc.html` — guión/referencias (el teleprompter con autoscroll es v2)
- `designs/support.js` — runtime para abrir los prototipos en el navegador (no se porta)
