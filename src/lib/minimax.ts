/**
 * Image enhancement with multiple provider support and multi-variation output.
 * - BytePlus Seedream 4.5: sequential_image_generation for 3 variations in 1 call
 * - Vertex AI Gemini: 3 parallel calls with different style prompts
 * - MiniMax: character-only (no product i2i) — not used for image editing
 */

export interface ImageVariation {
  provider: "seedream" | "gemini";
  label: string;
  dataUri: string;
}

export interface EnhanceResult {
  original: string;
  styled: string; // best/first variation for backward compat
  variations: ImageVariation[];
}

/**
 * Generate multiple enhanced variations of a product photo.
 * Runs Seedream and Gemini in parallel, returns all results.
 */
export async function enhanceImage(
  imageBase64: string,
  prompt: string,
  persona: string,
  postContext?: string
): Promise<EnhanceResult> {
  const originalDataUri = `data:image/jpeg;base64,${imageBase64}`;
  const allVariations: ImageVariation[] = [];

  // Run both providers in parallel
  const promises: Promise<ImageVariation[]>[] = [];

  const byteplusKey = process.env.ARK_API_KEY;
  if (byteplusKey) {
    promises.push(
      seedreamVariations(imageBase64, prompt, persona, byteplusKey)
        .catch((err) => {
          console.error("[ImageEdit] Seedream failed:", err.message);
          return [] as ImageVariation[];
        })
    );
  }

  const geminiKey = process.env.VERTEX_AI_API_KEY;
  if (geminiKey) {
    promises.push(
      geminiVariations(imageBase64, prompt, persona, geminiKey)
        .catch((err) => {
          console.error("[ImageEdit] Gemini failed:", err.message);
          return [] as ImageVariation[];
        })
    );
  }

  if (promises.length === 0) {
    throw new Error("No image API key configured (ARK_API_KEY or VERTEX_AI_API_KEY)");
  }

  const results = await Promise.all(promises);
  for (const variations of results) {
    allVariations.push(...variations);
  }

  if (allVariations.length === 0) {
    throw new Error("All image providers failed");
  }

  return {
    original: originalDataUri,
    styled: allVariations[0].dataUri,
    variations: allVariations,
  };
}

/* ------------------------------------------------------------------ */
/*  Style prompts per variation                                        */
/* ------------------------------------------------------------------ */

const STYLE_PROMPTS = {
  warm: (prompt: string, persona: string) =>
    `Keep this exact same product/dish. Enhance with warm golden-hour studio lighting, rich cinematic color grading, subtle steam and glow effects, soft bokeh background. Product: ${prompt}. Style: ${persona}. DO NOT add any text, captions, watermarks, or overlays. Output ONLY a photograph.`,

  cool: (prompt: string, persona: string) =>
    `Keep this exact same product/dish. Enhance with cool blue-white lighting, clean minimalist aesthetic, marble or concrete surface, sharp focus, modern premium feel. Product: ${prompt}. Style: ${persona}. DO NOT add any text, captions, watermarks, or overlays. Output ONLY a photograph.`,

  moody: (prompt: string, persona: string) =>
    `Keep this exact same product/dish. Enhance with dramatic dark moody lighting, deep shadows with spotlight on the product, rich warm accent lights in background, luxurious premium feel. Product: ${prompt}. Style: ${persona}. DO NOT add any text, captions, watermarks, or overlays. Output ONLY a photograph.`,
};

/* ------------------------------------------------------------------ */
/*  BytePlus Seedream 4.5 — 3 variations via sequential generation    */
/* ------------------------------------------------------------------ */

async function seedreamVariations(
  imageBase64: string,
  prompt: string,
  persona: string,
  apiKey: string
): Promise<ImageVariation[]> {
  const url = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";
  const imageDataUri = `data:image/jpeg;base64,${imageBase64}`;

  const stylePrompt = [
    `Generate 3 professional photography variations of this exact same product/dish:`,
    `Variation 1: Warm golden-hour studio lighting, cinematic color grading, subtle steam, soft bokeh background.`,
    `Variation 2: Cool minimalist lighting, clean marble surface, sharp focus, modern aesthetic.`,
    `Variation 3: Dark moody lighting, dramatic spotlight, deep shadows, luxurious premium feel.`,
    `Product: ${prompt}. Brand: ${persona}.`,
    `CRITICAL: Keep the exact same product in ALL variations. DO NOT add any text, captions, or watermarks.`,
  ].join(" ");

  const body = {
    model: "seedream-4-5-251128",
    prompt: stylePrompt,
    image: imageDataUri,
    sequential_image_generation: "auto",
    sequential_image_generation_options: { max_images: 3 },
    size: "1920x1920",
    response_format: "b64_json",
    watermark: false,
  };

  console.log("[ImageEdit] Seedream: requesting 3 sequential variations");

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
    throw new Error(`Seedream failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const items = data?.data || [];
  const labels = ["Warm Studio", "Cool Minimalist", "Dark Moody"];

  const variations: ImageVariation[] = [];
  for (let i = 0; i < items.length; i++) {
    const b64 = items[i]?.b64_json;
    const imgUrl = items[i]?.url;
    let dataUri = "";

    if (b64) {
      dataUri = `data:image/png;base64,${b64}`;
    } else if (imgUrl) {
      const r = await fetch(imgUrl);
      const buf = Buffer.from(await r.arrayBuffer());
      dataUri = `data:image/png;base64,${buf.toString("base64")}`;
    }

    if (dataUri) {
      variations.push({
        provider: "seedream",
        label: labels[i] || `Variation ${i + 1}`,
        dataUri,
      });
    }
  }

  console.log(`[ImageEdit] Seedream: got ${variations.length} variations`);
  return variations;
}

/* ------------------------------------------------------------------ */
/*  Vertex AI Gemini — 3 parallel calls with different styles         */
/* ------------------------------------------------------------------ */

async function geminiVariations(
  imageBase64: string,
  prompt: string,
  persona: string,
  apiKey: string
): Promise<ImageVariation[]> {
  const model = "gemini-3.1-flash-image-preview";
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;

  const styles = [
    { key: "warm" as const, label: "Warm Studio" },
    { key: "cool" as const, label: "Cool Minimalist" },
    { key: "moody" as const, label: "Dark Moody" },
  ];

  console.log("[ImageEdit] Gemini: requesting 3 parallel variations");

  const results = await Promise.all(
    styles.map(async ({ key, label }) => {
      const stylePrompt = STYLE_PROMPTS[key](prompt, persona);

      const body = {
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
            { text: stylePrompt },
          ],
        }],
        generationConfig: { responseModalities: ["IMAGE"] },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(`[ImageEdit] Gemini ${label} failed:`, res.status);
        return null;
      }

      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];

      for (const part of parts) {
        const inlineData = part.inlineData || part.inline_data;
        if (inlineData?.data) {
          const mime = inlineData.mimeType || inlineData.mime_type || "image/png";
          return {
            provider: "gemini" as const,
            label,
            dataUri: `data:${mime};base64,${inlineData.data}`,
          };
        }
      }
      return null;
    })
  );

  const variations = results.filter((v): v is NonNullable<typeof v> => v !== null) as ImageVariation[];
  console.log(`[ImageEdit] Gemini: got ${variations.length} variations`);
  return variations;
}
