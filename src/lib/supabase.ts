import { createClient } from "@insforge/sdk";

/**
 * Create an InsForge database client for server-side usage.
 * Returns the .database accessor which has .from()/.select()/.insert() etc.
 */
export function createServerClient() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const client = createClient({ baseUrl, anonKey, isServerMode: true });
  return client.database;
}
