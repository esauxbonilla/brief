import type { Channel, Status } from "./types";

export const CHANNELS: Record<Channel, { name: string; color: string }> = {
  reel: { name: "Reels", color: "#FF4F8B" },
  story: { name: "Stories", color: "#2BD4F0" },
  lead: { name: "Lead Magnets", color: "#FF8B3D" },
  carrusel: { name: "Carruseles", color: "#A6E83A" },
};

export const CHANNEL_KEYS = Object.keys(CHANNELS) as Channel[];

/** Status shown to the client. `atrasado` is derived, never stored. */
export type DisplayStatus = Status | "atrasado";

export const STATUS: Record<DisplayStatus, { name: string; color: string }> = {
  borrador: { name: "Borrador", color: "#7C8087" },
  grabar: { name: "Por grabar", color: "#F5B83D" },
  rehacer: { name: "Rehacer", color: "#F5B83D" },
  atrasado: { name: "Atrasado", color: "#FF5C5C" },
  grabado: { name: "Grabado", color: "#6FA8FF" },
  edicion: { name: "En edición", color: "#B990FF" },
  listo: { name: "Listo", color: "#4FD98A" },
  publicado: { name: "Publicado", color: "#7C8087" },
  cancelado: { name: "Cancelado", color: "#5E6168" },
};

/** The 5-step flow shown in the detail stepper and the legend. */
export const FLOW: Status[] = ["grabar", "grabado", "edicion", "listo", "publicado"];

export const ALL_STATUSES: Status[] = ["borrador", "grabar", "rehacer", "grabado", "edicion", "listo", "publicado", "cancelado"];

export const AMBER = "#F5B83D";
export const RED = "#FF5C5C";
export const GREEN = "#4FD98A";

/** Default editing days per channel (record_due_at = publish − edit_days − buffer). */
export const EDIT_DAYS: Record<Channel, number> = { reel: 3, story: 1, lead: 4, carrusel: 3 };

export const GENERIC: Record<Channel, { format: string; shots: string[] }> = {
  reel: { format: "Vertical · 30–45 s", shots: ["Intro a cámara", "Demostración del ejercicio", "Cierre con llamada a la acción"] },
  story: { format: "Vertical · 3–5 clips", shots: ["Clip de contexto", "Clip principal", "Pregunta a la audiencia"] },
  lead: { format: "Horizontal · 60–90 s", shots: ["Presentación a cámara", "Contenido principal", "Cierre"] },
  carrusel: { format: "Carrusel · 8 diapositivas", shots: ["Texto redactado por la agencia", "Diseño de diapositivas", "Revisión final"] },
};
