/**
 * Image enhancement: 1 Seedream (creative scenario) + 1 Gemini (pro styling) in parallel.
 * Seedream: reimagines the product in a new creative setting/scene
 * Gemini: enhances the original photo with professional photography styling
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
      withTimeout(seedreamScenario(imageBase64, prompt, persona, byteplusKey), 55000, "Seedream")
        .catch((err) => { console.error("[ImageEdit] Seedream:", err.message); return null; })
    );
  }

  const geminiKey = process.env.VERTEX_AI_API_KEY;
  if (geminiKey) {
    promises.push(
      withTimeout(geminiEnhance(imageBase64, prompt, persona, geminiKey), 55000, "Gemini")
        .catch((err) => { console.error("[ImageEdit] Gemini:", err.message); return null; })
    );
  }

  if (promises.length === 0) {
    throw new Error("No image API key configured (ARK_API_KEY or VERTEX_AI_API_KEY)");
  }

  const results = await Promise.all(promises);
  for (const v of results) if (v) allVariations.push(v);

  if (allVariations.length === 0) throw new Error("All image providers failed or timed out");

  return {
    original: originalDataUri,
    styled: allVariations[0].dataUri,
    variations: allVariations,
  };
}

/* ------------------------------------------------------------------ */
/*  Seedream: Creative scenario — reimagine the product in a new scene */
/* ------------------------------------------------------------------ */

async function seedreamScenario(
  imageBase64: string,
  prompt: string,
  persona: string,
  apiKey: string
): Promise<ImageVariation> {
  const url = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";
  const imageDataUri = `data:image/jpeg;base64,${imageBase64}`;

  // Creative scenario prompt — not just lighting, but a whole new setting
  const scenarioPrompt = [
    `Take this exact product and place it in a stunning, creative Instagram-worthy scene.`,
    `Product: ${prompt}. Brand: ${persona}.`,
    `Create a lifestyle scenario: show the product being used or displayed in an aspirational setting.`,
    `Examples of what to do: place it on a beautiful marble counter at a trendy cafe,`,
    `or at a rooftop restaurant at golden hour, or in a cozy home setting with candles,`,
    `or at a beach cabana, or in a modern kitchen with fresh ingredients around it.`,
    `Pick the most creative and visually striking scenario that fits the brand style.`,
    `The product must be the hero/focal point of the image.`,
    `DO NOT add any text, captions, watermarks, logos, or overlays.`,
  ].join(" ");

  console.log("[ImageEdit] Seedream: creative scenario");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "seedream-4-5-251128",
      prompt: scenarioPrompt,
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

  console.log("[ImageEdit] Seedream: success (creative scenario)");
  return { provider: "seedream", label: "Creative Scene", dataUri };
}

/* ------------------------------------------------------------------ */
/*  Gemini: Professional enhancement — same product, pro photography  */
/* ------------------------------------------------------------------ */

async function geminiEnhance(
  imageBase64: string,
  prompt: string,
  persona: string,
  apiKey: string
): Promise<ImageVariation> {
  const model = "gemini-3.1-flash-image-preview";
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;

  const stylePrompt = [
    `Keep this exact same product/dish but enhance the photo to professional Instagram quality.`,
    `Product: ${prompt}. Brand: ${persona}.`,
    `Professional studio lighting with warm golden tones, rich cinematic color grading,`,
    `subtle steam or glow effects, soft bokeh background, high saturation and contrast.`,
    `CRITICAL: DO NOT add any text, captions, watermarks, or overlays. Output ONLY a photograph.`,
  ].join(" ");

  console.log("[ImageEdit] Gemini: pro enhancement");

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
      console.log("[ImageEdit] Gemini: success (pro enhancement)");
      return { provider: "gemini", label: "Pro Enhanced", dataUri: `data:${mime};base64,${inlineData.data}` };
    }
  }

  throw new Error("Gemini returned no image data");
}
