export type Channel = "reel" | "story" | "lead" | "carrusel";

export type Status =
  | "borrador"
  | "grabar"
  | "rehacer"
  | "grabado"
  | "edicion"
  | "listo"
  | "publicado"
  | "cancelado";

export interface Agency {
  id: string;
  name: string;
  initials: string;
  logo_url: string | null;
}

export interface Client {
  id: string;
  agency_id: string;
  name: string;
  initials: string;
  avatar_url: string | null;
  phone: string | null;
  /** Drive folder where the client uploads the recorded material. */
  drive_url?: string | null;
  /** IANA timezone; all "day" logic (week, hoy/mañana, 20:00) uses it. */
  tz: string;
}

export interface ScriptBlock {
  id: string;
  piece_id: string;
  position: number;
  label: string;
  duration: string | null;
  lines: string[];
  note: string | null;
  recorded: boolean;
}

export interface Shot {
  id: string;
  piece_id: string;
  position: number;
  text: string;
  done: boolean;
}

export interface PieceReference {
  id: string;
  piece_id: string;
  block_id: string | null;
  image_url: string | null;
  title: string;
  note: string | null;
  requested_from_client: boolean;
  uploaded_url: string | null;
}

export interface Upload {
  id: string;
  piece_id: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export interface Piece {
  id: string;
  client_id: string;
  channel: Channel;
  title: string;
  status: Status;
  format: string | null;
  objective: string | null;
  hook: string | null;
  notes: string[];
  publish_at: string;
  record_due_at: string;
  edit_days: number;
  brief_sent_at: string | null;
  redo_reason: string | null;
  received_at: string | null;
}

/** A piece with everything the client views need. */
export interface PieceFull extends Piece {
  shots: Shot[];
  blocks: ScriptBlock[];
  references: PieceReference[];
  uploads: Upload[];
}
