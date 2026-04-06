import { createServerClient } from "@/lib/supabase";

export const maxDuration = 15;

/** POST — save a completed session */
export async function POST(request: Request) {
  const body = await request.json();
  const db = createServerClient();

  const { data, error } = await db
    .from("sessions")
    .insert({
      persona: body.persona,
      prompt: body.prompt,
      original_image_url: body.originalImageUrl,
      debate_messages: body.debateMessages,
      caption: body.caption,
      hashtags: body.hashtags,
      cta: body.cta,
      best_posting_time: body.bestPostingTime,
      enhanced_image_url: body.enhancedImageUrl,
      variations: body.variations,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Sessions] Insert error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ id: data.id });
}

/** GET — list past sessions (summary only) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const db = createServerClient();

  const { data, error } = await db
    .from("sessions")
    .select("id, persona, prompt, caption, enhanced_image_url, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ sessions: data });
}
