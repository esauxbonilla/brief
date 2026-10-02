"use server";

import { revalidatePath } from "next/cache";
import { repo } from "@/lib/data";
import { isDemo } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

// Client actions. Authorization lives in the data layer (Supabase RPCs check
// that the piece belongs to the signed-in client); here we only require a session.

async function session() {
  const s = await repo.clientSession();
  if (!s) throw new Error("Sesión no válida");
  return s;
}

export async function setRecorded(pieceId: string, recorded: boolean) {
  await session();
  const status = await repo.setRecorded(pieceId, recorded);
  revalidatePath("/", "layout");
  return status;
}

export async function toggleShot(shotId: string, done: boolean) {
  await session();
  await repo.toggleShot(shotId, done);
}

export async function toggleBlock(blockId: string, recorded: boolean) {
  await session();
  await repo.toggleBlock(blockId, recorded);
}

export type PreparedUpload = { demo: true; path: string } | { demo: false; path: string; token: string };

/** Reserves a storage path for a file. The browser uploads straight to Storage. */
export async function prepareUpload(pieceId: string, fileName: string): Promise<PreparedUpload> {
  const { client } = await session();
  const safe = fileName.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${client.id}/${pieceId}/${Date.now()}-${safe}`;
  if (isDemo) return { demo: true, path };
  const sb = await supabaseServer();
  const { data, error } = await sb.storage.from("material").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "No se pudo preparar la subida");
  return { demo: false, path: data.path, token: data.token };
}

export async function confirmReferenceUpload(refId: string, path: string) {
  await session();
  await repo.uploadReference(refId, path);
  revalidatePath("/", "layout");
}
