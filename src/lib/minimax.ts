const PLACEHOLDER_IMAGE =
  "https://placehold.co/1080x1080/6366f1/white?text=Enhanced+Image";

/**
 * Enhance a product photo using OpenAI gpt-image-1 (image edit).
 * Takes the original photo and returns it enhanced for Instagram.
 * Throws on failure instead of silently returning original.
 */
export async function enhanceImage(
  imageBase64: string,
  prompt: string,
  persona: string,
  postContext?: string
): Promise<{ original: string; styled: string }> {
  const originalDataUri = `data:image/jpeg;base64,${imageBase64}`;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured — cannot enhance image");
  }

  // Build a VERY aggressive edit prompt so the difference is clearly visible
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

  // Build multipart form data
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const blob = new Blob([imageBuffer], { type: "image/png" });

  const formData = new FormData();
  formData.append("model", "gpt-image-1");
  formData.append("image", blob, "photo.png");
  formData.append("prompt", editPrompt);
  formData.append("size", "1024x1024");

  console.log("[ImageEdit] Sending to OpenAI gpt-image-1, prompt length:", editPrompt.length, "image base64 length:", imageBase64.length);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[ImageEdit] OpenAI error:", response.status, errBody.slice(0, 500));
    throw new Error(`OpenAI image edit failed (${response.status}): ${errBody.slice(0, 100)}`);
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;

  if (!b64) {
    console.error("[ImageEdit] No b64_json in response. Keys:", Object.keys(data?.data?.[0] || {}));
    // Try URL fallback
    const url = data?.data?.[0]?.url;
    if (url) {
      console.log("[ImageEdit] Got URL instead of b64, fetching...");
      const imgRes = await fetch(url);
      const imgBuf = Buffer.from(await imgRes.arrayBuffer());
      const styledDataUri = `data:image/png;base64,${imgBuf.toString("base64")}`;
      return { original: originalDataUri, styled: styledDataUri };
    }
    throw new Error("OpenAI returned no image data (no b64_json or url)");
  }

  const styledDataUri = `data:image/png;base64,${b64}`;
  console.log("[ImageEdit] Success! Styled image base64 length:", b64.length);
  return { original: originalDataUri, styled: styledDataUri };
}
