/**
 * Enhance a product photo for Instagram.
 * Supports BytePlus Seedream 4.5 (primary) with Vertex AI Gemini fallback.
 * Throws on failure instead of silently returning original.
 */
export async function enhanceImage(
  imageBase64: string,
  prompt: string,
  persona: string,
  postContext?: string
): Promise<{ original: string; styled: string }> {
  const originalDataUri = `data:image/jpeg;base64,${imageBase64}`;

  // Gemini preserves the actual product (true image editing)
  // Seedream generates new images (doesn't keep the product)
  const geminiKey = process.env.VERTEX_AI_API_KEY;
  if (geminiKey) {
    return enhanceWithGemini(imageBase64, originalDataUri, prompt, persona, geminiKey);
  }

  const byteplusKey = process.env.ARK_API_KEY;
  if (byteplusKey) {
    return enhanceWithSeedream(imageBase64, originalDataUri, prompt, persona, byteplusKey);
  }

  throw new Error("No image API key configured (VERTEX_AI_API_KEY or ARK_API_KEY)");
}

/** Build a styling-only prompt — NO caption text, NO text rendering */
function buildStylePrompt(prompt: string, persona: string): string {
  return [
    `Reimagine this product photo as a stunning, professional Instagram-worthy image.`,
    `Product context: ${prompt}. Brand style: ${persona}.`,
    `Apply these photographic enhancements:`,
    `- Professional studio lighting with warm golden tones`,
    `- Rich cinematic color grading`,
    `- Subtle steam, sparkle, or glow effects on the product`,
    `- Soft bokeh/blurred background for depth`,
    `- High saturation and contrast for an appetizing, premium look`,
    `CRITICAL: DO NOT add any text, captions, watermarks, hashtags, logos, or overlays on the image.`,
    `CRITICAL: Output ONLY a photograph with zero text or writing anywhere.`,
    `The product must be clearly recognizable as the same item but shot in a dramatically different, professional style.`,
  ].join(" ");
}

/* ------------------------------------------------------------------ */
/*  BytePlus Seedream 4.5                                             */
/* ------------------------------------------------------------------ */

async function enhanceWithSeedream(
  imageBase64: string,
  originalDataUri: string,
  prompt: string,
  persona: string,
  apiKey: string
): Promise<{ original: string; styled: string }> {
  const stylePrompt = buildStylePrompt(prompt, persona);

  // Seedream 4.5 image-to-image via BytePlus Ark API
  const url = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";

  const body = {
    model: "seedream-4-5-251128",
    prompt: stylePrompt,
    reference_image: imageBase64,
    size: "1920x1920",
    response_format: "b64_json",
    n: 1,
  };

  console.log("[ImageEdit] Sending to BytePlus Seedream 4.5, prompt length:", stylePrompt.length);

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
    // Try URL fallback
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
