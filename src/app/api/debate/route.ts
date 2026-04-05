import { enhanceImage } from "@/lib/minimax";
import type { EnhanceResult } from "@/lib/minimax";
import { PERSONAS } from "@/lib/personas";
import { runDebate } from "@/lib/agents/orchestrator";
import type { AgentMessage } from "@/lib/agents/types";

/** Convert a File from FormData into a base64 string. */
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image") as File | null;
  const prompt = formData.get("prompt") as string | null;
  const personaId = formData.get("persona") as string | null;

  if (!image || !prompt || !personaId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: image, prompt, persona" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const persona = PERSONAS.find((p) => p.id === personaId);
  if (!persona) {
    return new Response(
      JSON.stringify({ error: `Unknown persona: ${personaId}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const imageBase64 = await fileToBase64(image);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, payload })}\n\n`)
        );
      };

      try {
        // Send original image immediately so UI shows it during debate
        const originalDataUri = `data:${image.type};base64,${imageBase64}`;
        send("image", { originalImageUrl: originalDataUri, enhancedImageUrl: originalDataUri });

        // Stream debate messages first — we'll use the result for image editing
        const allMessages: AgentMessage[] = [];
        let lastCaption = "";
        let lastHashtags: string[] = [];
        let lastCta = "";
        let lastPostingTime = "";

        for await (const message of runDebate(prompt, persona)) {
          allMessages.push(message);
          send("message", message);

          // Extract structured data from the approval message
          if (message.type === "approval") {
            const content = message.content;

            // Try to parse a JSON block fenced with ```json ... ```
            const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[1].trim());
                lastCaption = parsed.caption || lastCaption;
                lastHashtags = parsed.hashtags || lastHashtags;
                lastCta = parsed.cta || lastCta;
                lastPostingTime = parsed.bestPostingTime || lastPostingTime;
              } catch {
                // JSON parse failed -- fall through to pattern matching
              }
            }

            // Fallback: extract from markdown-formatted approval text
            // Format: **APPROVED CAPTION:**\ntext\n\n**HASHTAGS:**...
            const stripped = content.replace(/\*\*/g, "");

            if (!lastCaption) {
              const captionMatch = stripped.match(
                /APPROVED CAPTION:\s*\n([\s\S]*?)(?=\nHASHTAGS:|\nCTA:|\nBEST POSTING TIME:|\nRationale:|\n\n|$)/i
              );
              if (captionMatch) lastCaption = captionMatch[1].trim();
            }
            if (lastHashtags.length === 0) {
              const tagMatches = content.match(/#\w+/g);
              if (tagMatches) lastHashtags = tagMatches;
            }
            if (!lastCta) {
              const ctaMatch = stripped.match(
                /CTA:\s*\n?([\s\S]*?)(?=\nBEST POSTING TIME:|\nRationale:|\n\n|$)/i
              );
              if (ctaMatch) lastCta = ctaMatch[1].trim();
            }
            if (!lastPostingTime) {
              const timeMatch = stripped.match(
                /BEST POSTING TIME:\s*\n?([\s\S]*?)(?=\nRationale:|\n\n|$)/i
              );
              if (timeMatch) lastPostingTime = timeMatch[1].trim();
            }

            // Ultimate fallback: use full content as caption
            if (!lastCaption) {
              lastCaption = stripped;
            }
          }
        }

        // Now run image edit using the debate's caption as context
        send("message", {
          id: `system_${Date.now()}`,
          agent: "review_council",
          agentName: "Image Stylist",
          content: "Enhancing your photo to match the approved post...",
          timestamp: Date.now(),
          type: "system",
        });

        let imageResult: EnhanceResult;
        try {
          imageResult = await enhanceImage(
            imageBase64, prompt, persona.name,
            lastCaption
          );
          send("image", {
            originalImageUrl: imageResult.original,
            enhancedImageUrl: imageResult.styled,
            variations: imageResult.variations,
          });
        } catch (imgErr) {
          const errMsg = imgErr instanceof Error ? imgErr.message : "Image enhancement failed";
          console.error("[Debate] Image enhancement error:", errMsg);
          imageResult = { original: originalDataUri, styled: originalDataUri, variations: [] };
          send("message", {
            id: `error_img_${Date.now()}`,
            agent: "review_council",
            agentName: "Image Stylist",
            content: `Image enhancement unavailable: ${errMsg}. Showing original photo.`,
            timestamp: Date.now(),
            type: "system",
          });
          send("image", { originalImageUrl: originalDataUri, enhancedImageUrl: originalDataUri, variations: [] });
        }

        send("complete", {
          originalImageUrl: imageResult.original,
          enhancedImageUrl: imageResult.styled,
          variations: imageResult.variations,
          caption: lastCaption,
          hashtags: lastHashtags,
          cta: lastCta,
          bestPostingTime: lastPostingTime,
          messages: allMessages,
        });
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Debate failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
