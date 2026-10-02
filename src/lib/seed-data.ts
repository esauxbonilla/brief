// Example data from the prototypes (ITEMS, BRIEFS, BLOCKS). Dates are stored
// as offsets in days from "today" so the demo always looks current: the
// prototypes used 1 Oct 2026 as today, so offset 0 = that date. The prototype
// date is used as record_due_at, as the handoff asks.
// Used by the in-memory demo store and by scripts/gen-seed.ts (supabase/seed.sql).

import type { Channel, Status } from "./types";

export interface SeedPiece {
  key: string;
  due: number; // record_due_at offset in days from today
  channel: Channel;
  title: string;
  status: Status;
  briefSent?: boolean; // default true unless borrador
  redoReason?: string;
  format?: string;
  objective?: string;
  hook?: string;
  shots?: string[];
  notes?: string[];
  blocks?: SeedBlock[];
  references?: SeedReference[];
}

export interface SeedBlock {
  label: string;
  duration: string;
  lines: string[];
  note?: string;
}

export interface SeedReference {
  block?: number; // index into blocks
  image?: string;
  title: string;
  note: string;
  requested?: boolean;
}

export const SEED_AGENCY = { name: "Estudio Norte", initials: "EN" };
export const SEED_CLIENT = { name: "Marco Ruiz", initials: "MR", phone: "+52 55 0000 0000", tz: "America/Mexico_City" };

export const EDIT_DAYS: Record<Channel, number> = { reel: 3, story: 1, lead: 4, carrusel: 3 };

export const GENERIC: Record<Channel, { format: string; shots: string[] }> = {
  reel: { format: "Vertical · 30–45 s", shots: ["Intro a cámara", "Demostración del ejercicio", "Cierre con llamada a la acción"] },
  story: { format: "Vertical · 3–5 clips", shots: ["Clip de contexto", "Clip principal", "Pregunta a la audiencia"] },
  lead: { format: "Horizontal · 60–90 s", shots: ["Presentación a cámara", "Contenido principal", "Cierre"] },
  carrusel: { format: "Carrusel · 8 diapositivas", shots: ["Texto redactado por la agencia", "Diseño de diapositivas", "Revisión final"] },
};

const VERANO_BLOCKS: SeedBlock[] = [
  { label: "Gancho", duration: "5 s", lines: ["¿Sigues sin poder quitarte la playera porque te da pena enseñar tu abdomen, “si es que tienes”?"], note: "Mira directo a cámara. Pausa corta después de la pregunta." },
  { label: "Problema", duration: "10 s", lines: ["En enero muchos se prometieron tener un físico fuerte para estas vacaciones, pero ya estamos en julio y siguen igual.", "Y siempre escucho las mismas excusas: “tengo mucho trabajo, llego cansado, no bajo de peso con ninguna dieta”."] },
  { label: "Solución", duration: "8 s", lines: ["Son excusas que todos mis pacientes se han puesto. Pero cuando empezamos a trabajar juntos, se dieron cuenta de que no eran la gran cosa."] },
  { label: "Prueba social", duration: "15 s", lines: ["Mi paciente Ramiro estaba así hace 3 meses: tenía mucha grasa corporal que no dejaba ver el músculo que había construido.", "Y ahora que logró un gran cambio de definición, solo estaba esperando las vacaciones para poder presumir su físico.", "A pesar de que trabaja 8 horas al día y casi no tenía tiempo de entrenar."], note: "Aquí metemos la foto de Ramiro. Señala hacia abajo al decir “estaba así”." },
  { label: "CTA", duration: "8 s", lines: ["Si quieres saber exactamente lo que hicimos con Ramiro, comenta la palabra “Ramiro” y te envío un documento con el paso a paso que seguimos."], note: "Di “Ramiro” despacio y claro." },
];

export const SEED_PIECES: SeedPiece[] = [
  { key: "p0", due: -3, channel: "reel", title: "Calentamiento de 5 minutos", status: "publicado" },
  { key: "p1", due: -2, channel: "carrusel", title: "Mitos del cardio en ayunas", status: "publicado" },
  { key: "p2", due: -1, channel: "story", title: "Encuesta: ¿qué entrenas hoy?", status: "publicado" },
  {
    key: "late", due: -2, channel: "reel", title: "Tu pregunta más repetida", status: "grabar",
    objective: "Responder la duda que más te llega por mensaje directo. Genera confianza y ahorra respuestas.",
    hook: "«Esta es la pregunta que más me hacéis, y la respuesta corta es no.»",
  },
  {
    key: "p3", due: 0, channel: "reel", title: "Sentadilla búlgara paso a paso", status: "grabar",
    objective: "Enseñar la técnica correcta de un ejercicio que tus alumnos hacen mal. Buscamos que lo guarden para su día de pierna.",
    format: "Vertical · 30–45 s", hook: "«Si te duele la rodilla en la búlgara, mira esto.»",
    shots: ["Plano general de perfil: 3 repeticiones lentas", "Primer plano del pie delantero bien apoyado", "El error: rodilla hacia dentro (exagéralo)", "La corrección: 3 repeticiones bien hechas", "Cierre a cámara: «Guárdalo para tu día de pierna»"],
    notes: ["Luz natural, con la ventana de frente", "Camiseta lisa, sin logos", "Graba cada toma 2 o 3 veces; nosotros elegimos"],
  },
  {
    key: "p4", due: 0, channel: "story", title: "Mi rutina de mañana", status: "grabar",
    objective: "Mostrar tu día a día para que tu audiencia te sienta cercano.", format: "Vertical · 5 clips de 5 s",
    hook: "«Son las 6:30 y así empieza mi día.»",
    shots: ["Despertador y primer vaso de agua", "Movilidad 2 minutos, cámara fija", "Desayuno visto desde arriba", "Selfie a cámara: «¿Y tú cómo empiezas?»"],
    notes: ["No hace falta hablar en todos los clips", "Sonido ambiente está bien"],
  },
  {
    key: "p5", due: 1, channel: "reel", title: "3 errores en peso muerto", status: "grabar",
    objective: "Vídeo educativo corto que genere comentarios y compartidos.", format: "Vertical · 40–60 s",
    hook: "«El 90% hace mal el peso muerto. Estos son los 3 errores.»",
    shots: ["Intro a cámara con la barra detrás", "Error 1: espalda redondeada (de perfil)", "Error 2: barra lejos del cuerpo", "Error 3: tirar con los brazos", "Versión correcta completa, de perfil"],
    notes: ["Peso ligero, la técnica es lo que importa", "Cámara a la altura de la cadera"],
  },
  { key: "p6", due: 1, channel: "carrusel", title: "Cuánta proteína necesitas", status: "listo" },
  {
    key: "verano", due: 2, channel: "reel", title: "Sigues sin buen físico", status: "grabar",
    objective: "Reel de captación: atacar las excusas de verano y llevar a comentarios con la palabra clave.",
    format: "Vertical · unos 50 s", hook: "«¿Sigues sin poder quitarte la playera porque te da pena enseñar tu abdomen?»",
    shots: ["Gancho a cámara, plano medio", "Problema y excusas, plano medio", "Solución, más cerca", "Prueba social señalando hacia abajo", "CTA a cámara"],
    notes: ["Formato pantalla dividida: tú arriba, gráfico abajo", "Graba cada bloque por separado"],
    blocks: VERANO_BLOCKS,
    references: [
      { block: 0, image: "/demo/ref-microlanzamiento.png", title: "Formato pantalla dividida", note: "Tú hablas en la mitad de arriba. El gráfico de abajo lo ponemos nosotros en edición; no tienes que dibujarlo." },
      { block: 3, title: "Foto de Ramiro hace 3 meses", note: "La usamos en el bloque 4. Pídele permiso a Ramiro antes.", requested: true },
    ],
  },
  {
    key: "p7", due: 2, channel: "lead", title: "Intro guía de proteína", status: "grabar",
    objective: "Vídeo de bienvenida que verá quien descargue la guía gratuita.", format: "Horizontal · 60–90 s",
    hook: "«Gracias por descargar la guía. Te cuento cómo sacarle partido.»",
    shots: ["Presentación: quién eres y para quién es la guía", "Los 3 puntos clave de la guía", "Invitación a escribirte por mensaje directo"],
    notes: ["Fondo ordenado, sin espejo detrás", "Mira a la lente, no a la pantalla"],
  },
  {
    key: "redo", due: 3, channel: "story", title: "Detrás de cámaras", status: "rehacer",
    redoReason: "Se oye mucho eco. Grábalo en un cuarto más pequeño o con el micro de solapa.",
    objective: "Enseñar cómo preparamos el contenido para que tu audiencia vea el trabajo detrás.",
  },
  { key: "p9", due: 4, channel: "reel", title: "Rutina express de 15 minutos", status: "edicion" },
  { key: "p10", due: 5, channel: "carrusel", title: "5 snacks altos en proteína", status: "edicion" },
  { key: "p11", due: 6, channel: "story", title: "Día de pierna conmigo", status: "grabado" },
  { key: "p12", due: 7, channel: "lead", title: "Plan semanal descargable", status: "listo" },
  { key: "p13", due: 8, channel: "reel", title: "Respondo vuestras preguntas", status: "grabado" },
  { key: "p14", due: 9, channel: "story", title: "Preguntas y respuestas", status: "edicion" },
  { key: "p15", due: 11, channel: "reel", title: "Movilidad de cadera diaria", status: "grabar" },
  { key: "p16", due: 12, channel: "carrusel", title: "Cómo leer etiquetas", status: "edicion" },
  { key: "p17", due: 13, channel: "story", title: "Check-in de alumnos", status: "grabar" },
  { key: "p18", due: 14, channel: "reel", title: "Press banca sin dolor", status: "grabar" },
  { key: "p19", due: 16, channel: "carrusel", title: "Hábitos que sí funcionan", status: "listo" },
  { key: "p20", due: 18, channel: "reel", title: "Transformación de Laura", status: "grabar" },
  { key: "p21", due: 19, channel: "lead", title: "Reto de 7 días", status: "grabar" },
  { key: "p22", due: 21, channel: "story", title: "Mi comida post-entreno", status: "grabar" },
  { key: "p23", due: 22, channel: "carrusel", title: "Descanso y masa muscular", status: "edicion" },
  { key: "p24", due: 25, channel: "reel", title: "Abdominales sin crunch", status: "borrador", briefSent: false },
  { key: "p25", due: 27, channel: "carrusel", title: "Errores de principiante", status: "borrador", briefSent: false },
  { key: "p26", due: 29, channel: "story", title: "Halloween en el gym", status: "borrador", briefSent: false },
];

/** Fills generic brief fields the same way the prototypes do. */
export function seedDefaults(p: SeedPiece) {
  const g = GENERIC[p.channel];
  return {
    format: p.format ?? g.format,
    objective: p.objective ?? "Pieza planificada por Estudio Norte para este mes.",
    hook: p.hook ?? (p.channel === "carrusel" ? "Sin grabación: lo diseña la agencia." : "Te enviaremos el guion completo antes de la fecha."),
    shots: p.shots ?? g.shots,
    notes: p.notes ?? ["El brief detallado llega 7 días antes"],
    editDays: EDIT_DAYS[p.channel],
    briefSent: p.briefSent ?? p.status !== "borrador",
  };
}
