import { createServerClient } from "@/lib/supabase";

/** GET — load a full session by ID */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServerClient();

  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 404 });
  }

  return Response.json(data);
}
