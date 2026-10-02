import "server-only";
import { isDemo } from "../supabase/config";
import { demoRepo } from "./demo";
import type { Repo } from "./repo";
import { supabaseRepo } from "./supabase";

export const repo: Repo = isDemo ? demoRepo : supabaseRepo;
export type * from "./repo";
