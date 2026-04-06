import { enhanceImage } from "@/lib/minimax";

export const maxDuration = 180;

/** POST — regenerate images from provided data (no DB needed) */
export async function POST(request: Request) {
  const body = await request.json();
  const { imageBase64, prompt, persona, caption } = body;

  if (!imageBase64 || !prompt || !persona) {
    return Response.json({ error: "Missing imageBase64, prompt, or persona" }, { status: 400 });
  }

  const result = await enhanceImage(imageBase64, prompt, persona, caption);

  return Response.json({
    enhancedImageUrl: result.styled,
    variations: result.variations,
  });
}
