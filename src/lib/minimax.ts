/**
 * Image enhancement: 2 creative scene variations driven by the agent's approved post.
 * Both Seedream + Gemini generate scenarios matching the marketing narrative.
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

  // Use the agent's approved caption to drive creative direction
  const narrative = postContext || prompt;

  const byteplusKey = process.env.ARK_API_KEY;
  if (byteplusKey) {
    promises.push(
      withTimeout(
        seedreamScene(imageBase64, prompt, persona, narrative, "lifestyle"),
        55000, "Seedream"
      ).catch((err) => { console.error("[ImageEdit] Seedream:", err.message); return null; })
    );
  }

  const geminiKey = process.env.VERTEX_AI_API_KEY;
  if (geminiKey) {
    promises.push(
      withTimeout(
        geminiScene(imageBase64, prompt, persona, narrative),
        55000, "Gemini"
      ).catch((err) => { console.error("[ImageEdit] Gemini:", err.message); return null; })
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
/*  Seedream: Creative scene matching the marketing post narrative     */
/* ------------------------------------------------------------------ */

async function seedreamScene(
  imageBase64: string,
  prompt: string,
  persona: string,
  narrative: string,
  style: string
): Promise<ImageVariation> {
  const url = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";


  const scenePrompt = [
    `Take this exact product and create a stunning lifestyle scene for an Instagram marketing post.`,
    `The social media post narrative is: "${narrative.slice(0, 400)}"`,
    `Product brief: ${prompt}. Brand style: ${persona}.`,
    `Create a creative ${style} scene that MATCHES the post narrative above.`,
    `The product must be the hero — show it being used, displayed, or styled in a setting`,
    `that brings the marketing story to life. Think: aspirational lifestyle photography`,
    `that makes people stop scrolling and want to buy.`,
    `Different angle, different setting, different mood from the original photo.`,
    `DO NOT add any text, captions, watermarks, logos, or overlays. Only the photograph.`,
  ].join(" ");

  console.log("[ImageEdit] Seedream: narrative-driven scene");

  // Use reference_image (not image) to generate NEW creative scenes
  // image = subtle edits (same photo, just lighting) — NOT what we want
  // reference_image = creative reimagination (new angle, new setting) — THIS is what we want
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ARK_API_KEY}` },
    body: JSON.stringify({
      model: "seedream-4-5-251128",
      prompt: scenePrompt,
      reference_image: imageBase64,
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
  if (b64) dataUri = `data:image/png;base64,${b64}`;
  else if (imgUrl) {
    const r = await fetch(imgUrl);
    const buf = Buffer.from(await r.arrayBuffer());
    dataUri = `data:image/png;base64,${buf.toString("base64")}`;
  }
  if (!dataUri) throw new Error("Seedream returned no image data");

  console.log("[ImageEdit] Seedream: success");
  return { provider: "seedream", label: "Creative Scene", dataUri };
}

/* ------------------------------------------------------------------ */
/*  Gemini: Different creative scene also matching the post narrative  */
/* ------------------------------------------------------------------ */

async function geminiScene(
  imageBase64: string,
  prompt: string,
  persona: string,
  narrative: string,
): Promise<ImageVariation> {
  const model = "gemini-3.1-flash-image-preview";
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${process.env.VERTEX_AI_API_KEY}`;

  const scenePrompt = [
    `Reimagine this product in a completely different creative setting for an Instagram post.`,
    `The marketing post says: "${narrative.slice(0, 400)}"`,
    `Product: ${prompt}. Brand: ${persona}.`,
    `Create a NEW scene that matches the marketing narrative — different angle, different background,`,
    `different props and styling from the original photo. Make it look like a professional`,
    `marketing campaign shoot that brings the post story to life.`,
    `Show the product being used or displayed in an aspirational, scroll-stopping way.`,
    `CRITICAL: DO NOT add any text, captions, watermarks, or overlays. Output ONLY a photograph.`,
  ].join(" ");

  console.log("[ImageEdit] Gemini: narrative-driven scene");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          { text: scenePrompt },
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
      return { provider: "gemini", label: "Campaign Shot", dataUri: `data:${mime};base64,${inlineData.data}` };
    }
  }

  throw new Error("Gemini returned no image data");
}
