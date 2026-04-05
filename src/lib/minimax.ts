/**
 * Enhance a product photo for Instagram.
 * BytePlus Seedream 4.5 (primary) — uses `image` param with data URI for true i2i editing.
 * Vertex AI Gemini (fallback) — also does true image editing.
 * Throws on failure instead of silently returning original.
 */
export async function enhanceImage(
  imageBase64: string,
  prompt: string,
  persona: string,
  postContext?: string
): Promise<{ original: string; styled: string }> {
  const originalDataUri = `data:image/jpeg;base64,${imageBase64}`;

  // Seedream with `image` (data URI) = true image editing (preserves product)
  // `reference_image` = style inspiration only (generates different product)
  const byteplusKey = process.env.ARK_API_KEY;
  if (byteplusKey) {
    return enhanceWithSeedream(imageBase64, originalDataUri, prompt, persona, byteplusKey);
  }

  const geminiKey = process.env.VERTEX_AI_API_KEY;
  if (geminiKey) {
    return enhanceWithGemini(imageBase64, originalDataUri, prompt, persona, geminiKey);
  }

  throw new Error("No image API key configured (ARK_API_KEY or VERTEX_AI_API_KEY)");
}

/** Build a styling-only prompt — NO caption text, NO text rendering */
function buildStylePrompt(prompt: string, persona: string): string {
  return [
    `Keep this exact same product/dish but enhance the photo to professional Instagram quality.`,
    `Product context: ${prompt}. Brand style: ${persona}.`,
    `Photographic enhancements:`,
    `- Professional studio lighting with warm golden tones`,
    `- Rich cinematic color grading`,
    `- Subtle steam, sparkle, or glow effects on the product`,
    `- Soft bokeh/blurred background for depth`,
    `- High saturation and contrast for an appetizing, premium look`,
    `CRITICAL: DO NOT add any text, captions, watermarks, hashtags, logos, or overlays on the image.`,
    `CRITICAL: Output ONLY a photograph with zero text or writing anywhere.`,
    `The product must be clearly recognizable as the same item but with dramatically better photography.`,
  ].join(" ");
}

/* ------------------------------------------------------------------ */
/*  BytePlus Seedream 4.5 — true image editing via `image` data URI   */
/* ------------------------------------------------------------------ */

async function enhanceWithSeedream(
  imageBase64: string,
  originalDataUri: string,
  prompt: string,
  persona: string,
  apiKey: string
): Promise<{ original: string; styled: string }> {
  const stylePrompt = buildStylePrompt(prompt, persona);
  const url = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";

  // KEY: use `image` with data URI prefix for true editing (NOT `reference_image`)
  const imageDataUri = `data:image/jpeg;base64,${imageBase64}`;

  const body = {
    model: "seedream-4-5-251128",
    prompt: stylePrompt,
    image: imageDataUri,
    size: "1920x1920",
    response_format: "b64_json",
    watermark: false,
    n: 1,
  };

  console.log("[ImageEdit] Sending to BytePlus Seedream 4.5 (image data URI), prompt length:", stylePrompt.length);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[ImageEdit] BytePlus error:", response.status, errBody.slice(0, 500));
    throw new Error(`BytePlus Seedream failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;

  if (!b64) {
    const imgUrl = data?.data?.[0]?.url;
    if (imgUrl) {
      console.log("[ImageEdit] Seedream returned URL, fetching...");
      const imgRes = await fetch(imgUrl);
      const imgBuf = Buffer.from(await imgRes.arrayBuffer());
      return { original: originalDataUri, styled: `data:image/png;base64,${imgBuf.toString("base64")}` };
    }
    console.error("[ImageEdit] Seedream response:", JSON.stringify(data).slice(0, 300));
    throw new Error("Seedream returned no image data");
  }

  console.log("[ImageEdit] Seedream success! Image base64 length:", b64.length);
  return { original: originalDataUri, styled: `data:image/png;base64,${b64}` };
}

/* ------------------------------------------------------------------ */
/*  Vertex AI Gemini (fallback)                                       */
/* ------------------------------------------------------------------ */

async function enhanceWithGemini(
  imageBase64: string,
  originalDataUri: string,
  prompt: string,
  persona: string,
  apiKey: string
): Promise<{ original: string; styled: string }> {
  const stylePrompt = buildStylePrompt(prompt, persona);
  const model = "gemini-3.1-flash-image-preview";
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          { text: stylePrompt },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
    },
  };

  console.log("[ImageEdit] Sending to Vertex AI Gemini", model);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[ImageEdit] Vertex AI error:", response.status, errBody.slice(0, 500));
    throw new Error(`Vertex AI failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    throw new Error("Gemini returned no content parts");
  }

  for (const part of parts) {
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData?.data) {
      const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
      console.log("[ImageEdit] Gemini success! Image length:", inlineData.data.length);
      return { original: originalDataUri, styled: `data:${mimeType};base64,${inlineData.data}` };
    }
  }

  throw new Error("Gemini response contained no image data");
}
