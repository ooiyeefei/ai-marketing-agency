import { createServerClient } from "@/lib/supabase";
import { enhanceImage } from "@/lib/minimax";

export const maxDuration = 60;

/** POST — regenerate images for an existing session (skip debate) */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServerClient();

  // Fetch the session
  const { data: session, error } = await db
    .from("sessions")
    .select("prompt, persona, original_image_url, caption")
    .eq("id", id)
    .single();

  if (error || !session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Extract base64 from data URI
  const match = session.original_image_url?.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) {
    return Response.json({ error: "No original image in session" }, { status: 400 });
  }
  const imageBase64 = match[1];

  // Re-run image enhancement
  const result = await enhanceImage(imageBase64, session.prompt, session.persona, session.caption);

  // Update the session
  await db
    .from("sessions")
    .update({
      enhanced_image_url: result.styled,
      variations: result.variations,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return Response.json({
    enhancedImageUrl: result.styled,
    variations: result.variations,
  });
}
