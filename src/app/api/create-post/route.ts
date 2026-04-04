import { NextResponse } from "next/server";
import { enhanceImage } from "@/lib/minimax";
import { PERSONAS } from "@/lib/personas";
import { createServerClient } from "@/lib/supabase";
import type { PersonaConfig, CreatePostResponse } from "@/lib/types";

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

/** Inline copy generation -- mirrors generate-copy logic to avoid HTTP round-trip. */
async function generateCopyDirect(
  prompt: string,
  persona: PersonaConfig,
  imageDescription?: string
): Promise<{
  caption: string;
  hashtags: string[];
  cta: string;
  bestPostingTime: string;
  reasoning: string;
}> {
  const apiKey = process.env.MINIMAX_API_KEY;

  // Demo fallback data per persona
  const demoData: Record<string, {
    caption: string;
    hashtags: string[];
    cta: string;
    bestPostingTime: string;
    reasoning: string;
  }> = {
    "Trendy F&B": {
      caption:
        "This isn't just food. This is a MOMENT. Our new drop just hit the menu and trust us -- your taste buds aren't ready. One bite and you'll understand why the line's out the door.",
      hashtags: [
        "#foodie", "#foodporn", "#instafood", "#yummy", "#delicious",
        "#foodstagram", "#foodlover", "#tasty", "#eeeeeats", "#foodphotography",
        "#nomnom", "#newmenu", "#viralfood", "#trending", "#mustry",
        "#fooddrop", "#eatlocal", "#foodiesofinstagram", "#chefskiss", "#biteoftheday",
      ],
      cta: "Tag your foodie bestie & come try it before it's gone!",
      bestPostingTime: "Tuesday 11am EST",
      reasoning: "Trendy F&B audiences engage with hype-driven, FOMO-inducing copy.",
    },
    "Luxury Brand": {
      caption:
        "Crafted for those who appreciate the extraordinary. Every detail speaks to a legacy of uncompromising excellence -- because true luxury is never rushed, only refined.",
      hashtags: [
        "#luxury", "#luxurylifestyle", "#premium", "#exclusive", "#elegant",
        "#sophisticated", "#highend", "#craftsmanship", "#timeless", "#bespoke",
        "#luxurybrand", "#refinedliving", "#artisanal", "#heritage", "#opulence",
        "#discerning", "#curated", "#luxurydesign", "#masterpiece", "#iconic",
      ],
      cta: "Explore the collection -- link in bio.",
      bestPostingTime: "Wednesday 7pm EST",
      reasoning: "Luxury audiences engage with aspirational, refined language in evening hours.",
    },
    "Casual Ecom": {
      caption:
        "Okay real talk -- this one's been flying off the shelves and we totally get why. Comfy, cute, and crazy affordable? Yes please. Grab yours before we sell out (again).",
      hashtags: [
        "#shopnow", "#onlineshopping", "#musthave", "#bestdeal", "#trending",
        "#affordablestyle", "#shopsmall", "#newdrop", "#obsessed", "#addtocart",
        "#instashop", "#dealoftheday", "#styletip", "#fashionfinds", "#sale",
        "#budgetfriendly", "#treatyourself", "#bestseller", "#restocked", "#shoppingspree",
      ],
      cta: "Tap the link in bio to shop -- free shipping today only!",
      bestPostingTime: "Thursday 12pm EST",
      reasoning: "Casual ecom shoppers respond to conversational tone with urgency signals.",
    },
  };

  if (!apiKey) {
    return (
      demoData[persona.name] || {
        caption: `Check out our latest -- crafted with ${persona.tone} vibes just for you. Double tap if you love it!`,
        hashtags: [
          "#newpost", "#instadaily", "#instagood", "#photooftheday", "#trending",
          "#viral", "#explore", "#contentcreator", "#brandnew", "#mustsee",
          "#amazing", "#love", "#beautiful", "#style", "#inspiration",
          "#motivation", "#lifestyle", "#followus", "#share", "#community",
        ],
        cta: "Follow us for more & tap the link in bio!",
        bestPostingTime: "Tuesday 11am EST",
        reasoning: `Demo content for ${persona.tone} tone.`,
      }
    );
  }

  try {
    const systemPrompt = `You are an expert Instagram marketing copywriter for a ${persona.name} brand. Tone: ${persona.tone}. Emoji style: ${persona.emoji_style}. Generate engaging Instagram content.

You MUST respond with valid JSON only, no markdown, no code fences. Use this exact structure:
{
  "caption": "string",
  "hashtags": ["15-20 relevant hashtags"],
  "cta": "string",
  "bestPostingTime": "string e.g. Tuesday 11am EST",
  "reasoning": "string"
}`;

    const userPrompt = `Create an Instagram post for this brief:

Prompt: ${prompt}
Brand persona: ${persona.name} (tone: ${persona.tone}, emoji style: ${persona.emoji_style})${imageDescription ? `\nImage description: ${imageDescription}` : ""}

Generate a high-engagement Instagram caption with hashtags, CTA, and posting recommendation. Respond with JSON only.`;

    const response = await fetch(
      "https://api.minimaxi.chat/v1/text/chatcompletion_v2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "MiniMax-Text-01",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.9,
          max_tokens: 2048,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`AI API returned ${response.status}`);
    }

    const aiResponse = await response.json();
    const text = aiResponse.choices?.[0]?.message?.content || "";
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("AI call failed in create-post, using demo data:", error);
    return (
      demoData[persona.name] || {
        caption: "Check out our latest drop!",
        hashtags: ["#new", "#trending", "#musthave"],
        cta: "Link in bio!",
        bestPostingTime: "Tuesday 11am EST",
        reasoning: "Fallback demo content.",
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string | null;
    const personaName = formData.get("persona") as string | null;

    if (!image || !prompt || !personaName) {
      return NextResponse.json(
        { error: "Missing required fields: image, prompt, persona" },
        { status: 400 }
      );
    }

    const persona = PERSONAS.find((p) => p.id === personaName);
    if (!persona) {
      return NextResponse.json(
        { error: `Unknown persona: ${personaName}` },
        { status: 400 }
      );
    }

    // Convert image to base64
    const imageBase64 = await fileToBase64(image);

    // Run image enhancement and copy generation in PARALLEL
    const [imageResult, copyResult] = await Promise.all([
      enhanceImage(imageBase64, prompt, persona.name).catch(() => {
        const fallback = `data:${image.type};base64,${imageBase64}`;
        return { original: fallback, styled: fallback };
      }),
      generateCopyDirect(prompt, persona, `User-uploaded product photo for ${persona.name} brand`),
    ]);

    // Build the response — use original photo as the main image
    const result: CreatePostResponse = {
      enhancedImageUrl: imageResult.original,
      caption: copyResult.caption,
      hashtags: copyResult.hashtags,
      cta: copyResult.cta,
      bestPostingTime: copyResult.bestPostingTime,
      reasoning: copyResult.reasoning,
    };

    // Optionally store in Supabase (don't fail if not configured)
    try {
      const supabase = createServerClient();

      // Upload original image to storage
      const fileName = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data: uploadData } = await supabase.storage
        .from("product-photos")
        .upload(fileName, Buffer.from(imageBase64, "base64"), {
          contentType: image.type,
          upsert: false,
        });

      // Store post metadata
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from("product-photos")
          .getPublicUrl(fileName);

        await supabase.from("posts").insert({
          persona: persona.name,
          prompt,
          original_image_url: publicUrl,
          enhanced_image_url: imageResult.original,
          caption: copyResult.caption,
          hashtags: copyResult.hashtags,
          cta: copyResult.cta,
          best_posting_time: copyResult.bestPostingTime,
          reasoning: copyResult.reasoning,
          created_at: new Date().toISOString(),
        });
      }
    } catch (storageError) {
      // Supabase not configured or bucket doesn't exist -- that's fine
      console.log("Supabase storage skipped:", storageError instanceof Error ? storageError.message : "not configured");
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      {
        error: "Failed to create post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
