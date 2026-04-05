/**
 * Enhance a product photo using Vertex AI Gemini (image-to-image generation).
 * Sends the original photo + styling prompt to gemini-3.1-flash-image-preview
 * and returns the AI-generated styled version.
 * Throws on failure instead of silently returning original.
 */
export async function enhanceImage(
  imageBase64: string,
  prompt: string,
  persona: string,
  postContext?: string
): Promise<{ original: string; styled: string }> {
  const originalDataUri = `data:image/jpeg;base64,${imageBase64}`;
  const apiKey = process.env.VERTEX_AI_API_KEY;

  if (!apiKey) {
    throw new Error("VERTEX_AI_API_KEY not configured — cannot enhance image");
  }

  const contextDesc = postContext
    ? `This is for a social media post that says: "${postContext.slice(0, 300)}".`
    : "";

  const editPrompt = [
    `Transform this product photo into a stunning, magazine-quality Instagram post.`,
    `Context: ${prompt}. Brand style: ${persona}.`,
    contextDesc,
    `IMPORTANT EDITS TO MAKE:`,
    `- Add dramatic warm golden-hour lighting with visible light rays or lens flare`,
    `- Add rich, cinematic color grading (warm highlights, cool shadows)`,
    `- Add subtle steam, sparkle, or glow effects to make the product pop`,
    `- Enhance depth with a soft bokeh/blurred background`,
    `- Boost saturation and contrast for an appetizing, premium look`,
    `- Add a subtle vignette around the edges`,
    `The product must remain clearly recognizable but the overall mood and styling should be dramatically different from a casual phone photo.`,
  ].join(" ");

  const model = "gemini-3.1-flash-image-preview";
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64,
            },
          },
          { text: editPrompt },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  console.log("[ImageEdit] Sending to Vertex AI Gemini", model, "prompt length:", editPrompt.length, "image base64 length:", imageBase64.length);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[ImageEdit] Vertex AI error:", response.status, errBody.slice(0, 500));
    throw new Error(`Vertex AI image edit failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    console.error("[ImageEdit] No parts in Gemini response:", JSON.stringify(data).slice(0, 300));
    throw new Error("Gemini returned no content parts");
  }

  // Find the image part in the response
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      const styledDataUri = `data:${mimeType};base64,${part.inlineData.data}`;
      console.log("[ImageEdit] Success! Styled image base64 length:", part.inlineData.data.length);
      return { original: originalDataUri, styled: styledDataUri };
    }
    // Also check snake_case variant (REST API can return either)
    if (part.inline_data?.data) {
      const mimeType = part.inline_data.mime_type || "image/png";
      const styledDataUri = `data:${mimeType};base64,${part.inline_data.data}`;
      console.log("[ImageEdit] Success! Styled image base64 length:", part.inline_data.data.length);
      return { original: originalDataUri, styled: styledDataUri };
    }
  }

  // Log text parts for debugging
  const textParts = parts.filter((p: Record<string, unknown>) => p.text).map((p: Record<string, unknown>) => p.text);
  if (textParts.length > 0) {
    console.log("[ImageEdit] Got text but no image:", textParts.join(" ").slice(0, 200));
  }

  throw new Error("Gemini response contained no image data");
}
