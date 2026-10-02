import type { ParsedBlock } from "../script-parse";
import type { Agency, Channel, Client, PieceFull, Status, Upload } from "../types";

export interface ClientSession {
  client: Client;
  agency: Agency;
}

export interface AgencySession {
  agency: Agency;
  clients: Client[];
}

export interface PieceInput {
  id?: string;
  client_id: string;
  channel: Channel;
  title: string;
  format: string | null;
  objective: string | null;
  hook: string | null;
  notes: string[];
  shots: string[];
  publish_at: string;
  edit_days: number;
  record_due_at: string;
}

export interface ReferenceInput {
  piece_id: string;
  block_id: string | null;
  image_url: string | null;
  title: string;
  note: string | null;
  requested_from_client: boolean;
}

export interface Notification {
  id: string;
  client_id: string;
  kind: "brief" | "reminder" | "overdue" | "redo";
  piece_id: string | null;
  message: string;
  created_at: string;
  sent_at: string | null;
}

/** Data access. Two implementations: Supabase (RLS) and an in-memory demo. */
export interface Repo {
  clientSession(): Promise<ClientSession | null>;
  agencySession(): Promise<AgencySession | null>;

  // Client side — only visible pieces, only allowed transitions.
  clientPieces(clientId: string): Promise<PieceFull[]>;
  setRecorded(pieceId: string, recorded: boolean): Promise<Status>;
  toggleShot(shotId: string, done: boolean): Promise<void>;
  toggleBlock(blockId: string, recorded: boolean): Promise<void>;
  addUpload(pieceId: string, path: string, name: string): Promise<Upload>;
  uploadReference(refId: string, path: string): Promise<void>;
  /** URL the browser can open for a stored file path (signed for private files). */
  fileUrl(path: string): Promise<string>;

  // Agency panel.
  agencyPieces(clientId: string): Promise<PieceFull[]>;
  agencyPiece(id: string): Promise<PieceFull | null>;
  savePiece(input: PieceInput): Promise<string>;
  deletePiece(id: string): Promise<void>;
  sendBriefs(ids: string[]): Promise<void>;
  setStatus(id: string, status: Status, redoReason?: string | null): Promise<void>;
  reschedule(id: string, publishAt: string, recordDueAt: string): Promise<void>;
  setClientDrive(clientId: string, url: string | null): Promise<void>;
  markReceived(id: string): Promise<void>;
  setBlocks(pieceId: string, blocks: ParsedBlock[]): Promise<void>;
  addReference(input: ReferenceInput): Promise<void>;
  deleteReference(id: string): Promise<void>;
  enqueueNotification(n: Omit<Notification, "id" | "created_at" | "sent_at">): Promise<void>;
  pendingNotifications(): Promise<Notification[]>;
}
