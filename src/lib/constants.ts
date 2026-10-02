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
