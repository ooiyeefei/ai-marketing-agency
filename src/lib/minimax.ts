/**
 * Image enhancement: 1 Seedream + 1 Gemini in parallel.
 * Fast enough for serverless (2 calls, ~15s each).
 */

export interface ImageVariation {
  provider: "seedream" | "gemini";
  label: string;
  dataUri: string;
}

export interface EnhanceResult {
  original: string;
  styled: string;
  variations: ImageVariation[];
}

/** 50-second timeout wrapper */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export async function enhanceImage(
  imageBase64: string,
  prompt: string,
  persona: string,
  postContext?: string
): Promise<EnhanceResult> {
  const originalDataUri = `data:image/jpeg;base64,${imageBase64}`;
  const allVariations: ImageVariation[] = [];

  const promises: Promise<ImageVariation | null>[] = [];

  const byteplusKey = process.env.ARK_API_KEY;
  if (byteplusKey) {
    promises.push(
      withTimeout(
        seedreamSingle(imageBase64, prompt, persona, byteplusKey),
        50000, "Seedream"
      ).catch((err) => { console.error("[ImageEdit] Seedream:", err.message); return null; })
    );
  }

  const geminiKey = process.env.VERTEX_AI_API_KEY;
  if (geminiKey) {
    promises.push(
      withTimeout(
        geminiSingle(imageBase64, prompt, persona, geminiKey),
        50000, "Gemini"
      ).catch((err) => { console.error("[ImageEdit] Gemini:", err.message); return null; })
    );
  }

  if (promises.length === 0) {
    throw new Error("No image API key configured (ARK_API_KEY or VERTEX_AI_API_KEY)");
  }

  const results = await Promise.all(promises);
  for (const v of results) {
    if (v) allVariations.push(v);
  }

  if (allVariations.length === 0) {
    throw new Error("All image providers failed or timed out");
  }

  return {
    original: originalDataUri,
    styled: allVariations[0].dataUri,
    variations: allVariations,
  };
}

/** Styling prompt — no caption text, no text rendering */
function buildStylePrompt(prompt: string, persona: string): string {
  return [
    `Keep this exact same product/dish but enhance the photo to professional Instagram quality.`,
    `Product context: ${prompt}. Brand style: ${persona}.`,
    `Professional studio lighting with warm golden tones, rich cinematic color grading,`,
    `subtle steam or glow effects, soft bokeh background, high saturation and contrast.`,
    `CRITICAL: DO NOT add any text, captions, watermarks, or overlays. Output ONLY a photograph.`,
  ].join(" ");
}

/* ------------------------------------------------------------------ */
/*  BytePlus Seedream 4.5 — single image                              */
/* ------------------------------------------------------------------ */

async function seedreamSingle(
  imageBase64: string,
  prompt: string,
  persona: string,
  apiKey: string
): Promise<ImageVariation> {
  const url = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";
  const imageDataUri = `data:image/jpeg;base64,${imageBase64}`;
  const stylePrompt = buildStylePrompt(prompt, persona);

  console.log("[ImageEdit] Seedream: sending single variation");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "seedream-4-5-251128",
      prompt: stylePrompt,
      image: imageDataUri,
      size: "1920x1920",
      response_format: "b64_json",
      watermark: false,
      n: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Seedream (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  const imgUrl = data?.data?.[0]?.url;

  let dataUri = "";
  if (b64) {
    dataUri = `data:image/png;base64,${b64}`;
  } else if (imgUrl) {
    const r = await fetch(imgUrl);
    const buf = Buffer.from(await r.arrayBuffer());
    dataUri = `data:image/png;base64,${buf.toString("base64")}`;
  }

  if (!dataUri) throw new Error("Seedream returned no image data");

  console.log("[ImageEdit] Seedream: success");
  return { provider: "seedream", label: "Seedream 4.5", dataUri };
}

/* ------------------------------------------------------------------ */
/*  Vertex AI Gemini — single image                                    */
/* ------------------------------------------------------------------ */

async function geminiSingle(
  imageBase64: string,
  prompt: string,
  persona: string,
  apiKey: string
): Promise<ImageVariation> {
  const model = "gemini-3.1-flash-image-preview";
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;
  const stylePrompt = buildStylePrompt(prompt, persona);

  console.log("[ImageEdit] Gemini: sending single variation");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          { text: stylePrompt },
        ],
      }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData?.data) {
      const mime = inlineData.mimeType || inlineData.mime_type || "image/png";
      console.log("[ImageEdit] Gemini: success");
      return { provider: "gemini", label: "Gemini 3.1", dataUri: `data:${mime};base64,${inlineData.data}` };
    }
  }

  throw new Error("Gemini returned no image data");
}
