-- Generado por scripts/gen-seed.ts — no editar a mano.
-- Datos de ejemplo de los prototipos. Fechas relativas al día en que se ejecuta.

do $$
declare a uuid; c uuid; p uuid; b uuid;
begin
insert into agencies (name, initials) values ('Estudio Norte', 'EN') returning id into a;
insert into clients (agency_id, name, initials, phone, tz, email) values (a, 'Marco Ruiz', 'MR', '+52 55 0000 0000', 'America/Mexico_City', 'marco@example.com') returning id into c;

-- Calentamiento de 5 minutos
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Calentamiento de 5 minutos', 'publicado', 'Vertical · 30–45 s', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 1)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + -3)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + -10)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Intro a cámara', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Demostración del ejercicio', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre con llamada a la acción', true);

-- Mitos del cardio en ayunas
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'carrusel', 'Mitos del cardio en ayunas', 'publicado', 'Carrusel · 8 diapositivas', 'Pieza planificada por Estudio Norte para este mes.', 'Sin grabación: lo diseña la agencia.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 2)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + -2)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + -9)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Texto redactado por la agencia', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Diseño de diapositivas', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Revisión final', true);

-- Encuesta: ¿qué entrenas hoy?
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'story', 'Encuesta: ¿qué entrenas hoy?', 'publicado', 'Vertical · 3–5 clips', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 1)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + -1)::timestamp + time '20:00') at time zone 'America/Mexico_City', 1, ((current_date + -8)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Clip de contexto', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Clip principal', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Pregunta a la audiencia', true);

-- Tu pregunta más repetida
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Tu pregunta más repetida', 'grabar', 'Vertical · 30–45 s', 'Responder la duda que más te llega por mensaje directo. Genera confianza y ahorra respuestas.', '«Esta es la pregunta que más me hacéis, y la respuesta corta es no.»', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 2)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + -2)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + -9)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Intro a cámara', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Demostración del ejercicio', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre con llamada a la acción', false);

-- Sentadilla búlgara paso a paso
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Sentadilla búlgara paso a paso', 'grabar', 'Vertical · 30–45 s', 'Enseñar la técnica correcta de un ejercicio que tus alumnos hacen mal. Buscamos que lo guarden para su día de pierna.', '«Si te duele la rodilla en la búlgara, mira esto.»', array['Luz natural, con la ventana de frente', 'Camiseta lisa, sin logos', 'Graba cada toma 2 o 3 veces; nosotros elegimos']::text[],
  ((current_date + 4)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 0)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + -7)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Plano general de perfil: 3 repeticiones lentas', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Primer plano del pie delantero bien apoyado', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'El error: rodilla hacia dentro (exagéralo)', false);
insert into shots (piece_id, position, text, done) values (p, 3, 'La corrección: 3 repeticiones bien hechas', false);
insert into shots (piece_id, position, text, done) values (p, 4, 'Cierre a cámara: «Guárdalo para tu día de pierna»', false);

-- Mi rutina de mañana
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'story', 'Mi rutina de mañana', 'grabar', 'Vertical · 5 clips de 5 s', 'Mostrar tu día a día para que tu audiencia te sienta cercano.', '«Son las 6:30 y así empieza mi día.»', array['No hace falta hablar en todos los clips', 'Sonido ambiente está bien']::text[],
  ((current_date + 2)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 0)::timestamp + time '20:00') at time zone 'America/Mexico_City', 1, ((current_date + -7)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Despertador y primer vaso de agua', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Movilidad 2 minutos, cámara fija', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Desayuno visto desde arriba', false);
insert into shots (piece_id, position, text, done) values (p, 3, 'Selfie a cámara: «¿Y tú cómo empiezas?»', false);

-- 3 errores en peso muerto
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', '3 errores en peso muerto', 'grabar', 'Vertical · 40–60 s', 'Vídeo educativo corto que genere comentarios y compartidos.', '«El 90% hace mal el peso muerto. Estos son los 3 errores.»', array['Peso ligero, la técnica es lo que importa', 'Cámara a la altura de la cadera']::text[],
  ((current_date + 5)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 1)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + -6)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Intro a cámara con la barra detrás', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Error 1: espalda redondeada (de perfil)', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Error 2: barra lejos del cuerpo', false);
insert into shots (piece_id, position, text, done) values (p, 3, 'Error 3: tirar con los brazos', false);
insert into shots (piece_id, position, text, done) values (p, 4, 'Versión correcta completa, de perfil', false);

-- Cuánta proteína necesitas
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'carrusel', 'Cuánta proteína necesitas', 'listo', 'Carrusel · 8 diapositivas', 'Pieza planificada por Estudio Norte para este mes.', 'Sin grabación: lo diseña la agencia.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 5)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 1)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + -6)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Texto redactado por la agencia', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Diseño de diapositivas', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Revisión final', true);

-- Sigues sin buen físico
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Sigues sin buen físico', 'grabar', 'Vertical · unos 50 s', 'Reel de captación: atacar las excusas de verano y llevar a comentarios con la palabra clave.', '«¿Sigues sin poder quitarte la playera porque te da pena enseñar tu abdomen?»', array['Formato pantalla dividida: tú arriba, gráfico abajo', 'Graba cada bloque por separado']::text[],
  ((current_date + 6)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 2)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + -5)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Gancho a cámara, plano medio', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Problema y excusas, plano medio', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Solución, más cerca', false);
insert into shots (piece_id, position, text, done) values (p, 3, 'Prueba social señalando hacia abajo', false);
insert into shots (piece_id, position, text, done) values (p, 4, 'CTA a cámara', false);
insert into script_blocks (piece_id, position, label, duration, lines, note) values (p, 0, 'Gancho', '5 s', array['¿Sigues sin poder quitarte la playera porque te da pena enseñar tu abdomen, “si es que tienes”?']::text[], 'Mira directo a cámara. Pausa corta después de la pregunta.') returning id into b;
perform set_config('seed.b0', b::text, true);
insert into script_blocks (piece_id, position, label, duration, lines, note) values (p, 1, 'Problema', '10 s', array['En enero muchos se prometieron tener un físico fuerte para estas vacaciones, pero ya estamos en julio y siguen igual.', 'Y siempre escucho las mismas excusas: “tengo mucho trabajo, llego cansado, no bajo de peso con ninguna dieta”.']::text[], null) returning id into b;
perform set_config('seed.b1', b::text, true);
insert into script_blocks (piece_id, position, label, duration, lines, note) values (p, 2, 'Solución', '8 s', array['Son excusas que todos mis pacientes se han puesto. Pero cuando empezamos a trabajar juntos, se dieron cuenta de que no eran la gran cosa.']::text[], null) returning id into b;
perform set_config('seed.b2', b::text, true);
insert into script_blocks (piece_id, position, label, duration, lines, note) values (p, 3, 'Prueba social', '15 s', array['Mi paciente Ramiro estaba así hace 3 meses: tenía mucha grasa corporal que no dejaba ver el músculo que había construido.', 'Y ahora que logró un gran cambio de definición, solo estaba esperando las vacaciones para poder presumir su físico.', 'A pesar de que trabaja 8 horas al día y casi no tenía tiempo de entrenar.']::text[], 'Aquí metemos la foto de Ramiro. Señala hacia abajo al decir “estaba así”.') returning id into b;
perform set_config('seed.b3', b::text, true);
insert into script_blocks (piece_id, position, label, duration, lines, note) values (p, 4, 'CTA', '8 s', array['Si quieres saber exactamente lo que hicimos con Ramiro, comenta la palabra “Ramiro” y te envío un documento con el paso a paso que seguimos.']::text[], 'Di “Ramiro” despacio y claro.') returning id into b;
perform set_config('seed.b4', b::text, true);
insert into piece_references (piece_id, block_id, image_url, title, note, requested_from_client) values (p, current_setting('seed.b0')::uuid, '/demo/ref-microlanzamiento.png', 'Formato pantalla dividida', 'Tú hablas en la mitad de arriba. El gráfico de abajo lo ponemos nosotros en edición; no tienes que dibujarlo.', false);
insert into piece_references (piece_id, block_id, image_url, title, note, requested_from_client) values (p, current_setting('seed.b3')::uuid, null, 'Foto de Ramiro hace 3 meses', 'La usamos en el bloque 4. Pídele permiso a Ramiro antes.', true);

-- Intro guía de proteína
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'lead', 'Intro guía de proteína', 'grabar', 'Horizontal · 60–90 s', 'Vídeo de bienvenida que verá quien descargue la guía gratuita.', '«Gracias por descargar la guía. Te cuento cómo sacarle partido.»', array['Fondo ordenado, sin espejo detrás', 'Mira a la lente, no a la pantalla']::text[],
  ((current_date + 7)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 2)::timestamp + time '20:00') at time zone 'America/Mexico_City', 4, ((current_date + -5)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Presentación: quién eres y para quién es la guía', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Los 3 puntos clave de la guía', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Invitación a escribirte por mensaje directo', false);

-- Detrás de cámaras
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'story', 'Detrás de cámaras', 'rehacer', 'Vertical · 3–5 clips', 'Enseñar cómo preparamos el contenido para que tu audiencia vea el trabajo detrás.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 5)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 3)::timestamp + time '20:00') at time zone 'America/Mexico_City', 1, ((current_date + -4)::timestamp + time '20:00') at time zone 'America/Mexico_City', 'Se oye mucho eco. Grábalo en un cuarto más pequeño o con el micro de solapa.') returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Clip de contexto', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Clip principal', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Pregunta a la audiencia', false);

-- Rutina express de 15 minutos
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Rutina express de 15 minutos', 'edicion', 'Vertical · 30–45 s', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 8)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 4)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + -3)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Intro a cámara', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Demostración del ejercicio', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre con llamada a la acción', true);

-- 5 snacks altos en proteína
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'carrusel', '5 snacks altos en proteína', 'edicion', 'Carrusel · 8 diapositivas', 'Pieza planificada por Estudio Norte para este mes.', 'Sin grabación: lo diseña la agencia.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 9)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 5)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + -2)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Texto redactado por la agencia', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Diseño de diapositivas', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Revisión final', true);

-- Día de pierna conmigo
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'story', 'Día de pierna conmigo', 'grabado', 'Vertical · 3–5 clips', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 8)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 6)::timestamp + time '20:00') at time zone 'America/Mexico_City', 1, ((current_date + -1)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Clip de contexto', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Clip principal', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Pregunta a la audiencia', true);

-- Plan semanal descargable
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'lead', 'Plan semanal descargable', 'listo', 'Horizontal · 60–90 s', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 12)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 7)::timestamp + time '20:00') at time zone 'America/Mexico_City', 4, ((current_date + 0)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Presentación a cámara', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Contenido principal', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre', true);

-- Respondo vuestras preguntas
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Respondo vuestras preguntas', 'grabado', 'Vertical · 30–45 s', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 12)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 8)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + 1)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Intro a cámara', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Demostración del ejercicio', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre con llamada a la acción', true);

-- Preguntas y respuestas
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'story', 'Preguntas y respuestas', 'edicion', 'Vertical · 3–5 clips', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 11)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 9)::timestamp + time '20:00') at time zone 'America/Mexico_City', 1, ((current_date + 2)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Clip de contexto', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Clip principal', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Pregunta a la audiencia', true);

-- Movilidad de cadera diaria
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Movilidad de cadera diaria', 'grabar', 'Vertical · 30–45 s', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 15)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 11)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + 4)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Intro a cámara', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Demostración del ejercicio', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre con llamada a la acción', false);

-- Cómo leer etiquetas
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'carrusel', 'Cómo leer etiquetas', 'edicion', 'Carrusel · 8 diapositivas', 'Pieza planificada por Estudio Norte para este mes.', 'Sin grabación: lo diseña la agencia.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 16)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 12)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + 5)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Texto redactado por la agencia', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Diseño de diapositivas', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Revisión final', true);

-- Check-in de alumnos
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'story', 'Check-in de alumnos', 'grabar', 'Vertical · 3–5 clips', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 15)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 13)::timestamp + time '20:00') at time zone 'America/Mexico_City', 1, ((current_date + 6)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Clip de contexto', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Clip principal', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Pregunta a la audiencia', false);

-- Press banca sin dolor
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Press banca sin dolor', 'grabar', 'Vertical · 30–45 s', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 18)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 14)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + 7)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Intro a cámara', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Demostración del ejercicio', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre con llamada a la acción', false);

-- Hábitos que sí funcionan
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'carrusel', 'Hábitos que sí funcionan', 'listo', 'Carrusel · 8 diapositivas', 'Pieza planificada por Estudio Norte para este mes.', 'Sin grabación: lo diseña la agencia.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 20)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 16)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + 9)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Texto redactado por la agencia', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Diseño de diapositivas', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Revisión final', true);

-- Transformación de Laura
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Transformación de Laura', 'grabar', 'Vertical · 30–45 s', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 22)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 18)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + 11)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Intro a cámara', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Demostración del ejercicio', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre con llamada a la acción', false);

-- Reto de 7 días
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'lead', 'Reto de 7 días', 'grabar', 'Horizontal · 60–90 s', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 24)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 19)::timestamp + time '20:00') at time zone 'America/Mexico_City', 4, ((current_date + 12)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Presentación a cámara', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Contenido principal', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre', false);

-- Mi comida post-entreno
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'story', 'Mi comida post-entreno', 'grabar', 'Vertical · 3–5 clips', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 23)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 21)::timestamp + time '20:00') at time zone 'America/Mexico_City', 1, ((current_date + 14)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Clip de contexto', false);
insert into shots (piece_id, position, text, done) values (p, 1, 'Clip principal', false);
insert into shots (piece_id, position, text, done) values (p, 2, 'Pregunta a la audiencia', false);

-- Descanso y masa muscular
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'carrusel', 'Descanso y masa muscular', 'edicion', 'Carrusel · 8 diapositivas', 'Pieza planificada por Estudio Norte para este mes.', 'Sin grabación: lo diseña la agencia.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 26)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 22)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, ((current_date + 15)::timestamp + time '20:00') at time zone 'America/Mexico_City', null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Texto redactado por la agencia', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Diseño de diapositivas', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Revisión final', true);

-- Abdominales sin crunch
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'reel', 'Abdominales sin crunch', 'borrador', 'Vertical · 30–45 s', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 29)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 25)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, null, null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Intro a cámara', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Demostración del ejercicio', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Cierre con llamada a la acción', true);

-- Errores de principiante
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'carrusel', 'Errores de principiante', 'borrador', 'Carrusel · 8 diapositivas', 'Pieza planificada por Estudio Norte para este mes.', 'Sin grabación: lo diseña la agencia.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 31)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 27)::timestamp + time '20:00') at time zone 'America/Mexico_City', 3, null, null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Texto redactado por la agencia', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Diseño de diapositivas', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Revisión final', true);

-- Halloween en el gym
insert into pieces (client_id, channel, title, status, format, objective, hook, notes, publish_at, record_due_at, edit_days, brief_sent_at, redo_reason)
values (c, 'story', 'Halloween en el gym', 'borrador', 'Vertical · 3–5 clips', 'Pieza planificada por Estudio Norte para este mes.', 'Te enviaremos el guion completo antes de la fecha.', array['El brief detallado llega 7 días antes']::text[],
  ((current_date + 31)::timestamp + time '20:00') at time zone 'America/Mexico_City', ((current_date + 29)::timestamp + time '20:00') at time zone 'America/Mexico_City', 1, null, null) returning id into p;
insert into shots (piece_id, position, text, done) values (p, 0, 'Clip de contexto', true);
insert into shots (piece_id, position, text, done) values (p, 1, 'Clip principal', true);
insert into shots (piece_id, position, text, done) values (p, 2, 'Pregunta a la audiencia', true);
end $$;
