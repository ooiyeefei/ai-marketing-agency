const PLACEHOLDER_IMAGE =
  "https://placehold.co/1080x1080/6366f1/white?text=Enhanced+Image";

/**
 * Enhance a product photo using OpenAI gpt-image-1 (image edit).
 * Takes the original photo and returns it enhanced for Instagram.
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
    console.warn("[ImageEdit] No OPENAI_API_KEY — returning original");
    return { original: originalDataUri, styled: originalDataUri };
  }

  // Use the generated post context to make the image edit match the social media story
  const contextDesc = postContext
    ? `The social media post for this image says: "${postContext}". Edit the photo to visually match this narrative and mood.`
    : "";

  const editPrompt = `Edit this product photo for an Instagram post. Keep the EXACT same dish/product but enhance it to match this context: ${prompt}. Brand style: ${persona}. ${contextDesc} Make it look like a professional Instagram food/product photo — dramatic lighting, appetizing styling, slight steam or warmth effects if appropriate. Must be recognizably the same dish.`;

  try {
    // Build multipart form data
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const blob = new Blob([imageBuffer], { type: "image/png" });

    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("image", blob, "photo.png");
    formData.append("prompt", editPrompt);
    formData.append("size", "1024x1024");
    formData.append("quality", "high");
    formData.append("response_format", "b64_json");

    console.log("[ImageEdit] Sending to OpenAI gpt-image-1, base64 length:", imageBase64.length);

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[ImageEdit] OpenAI error:", response.status, err.slice(0, 200));
      return { original: originalDataUri, styled: originalDataUri };
    }

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;

    if (!b64) {
      console.error("[ImageEdit] No image in response");
      return { original: originalDataUri, styled: originalDataUri };
    }

    const styledDataUri = `data:image/png;base64,${b64}`;
    console.log("[ImageEdit] Success! Styled image base64 length:", b64.length);
    return { original: originalDataUri, styled: styledDataUri };
  } catch (error) {
    console.error("[ImageEdit] Failed:", error);
    return { original: originalDataUri, styled: originalDataUri };
  }
}
