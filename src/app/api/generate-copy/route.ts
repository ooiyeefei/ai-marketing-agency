import { NextResponse } from "next/server";
import { PERSONAS } from "@/lib/personas";
import type { PersonaConfig } from "@/lib/types";

function getDemoContent(persona: PersonaConfig) {
  const demoByTone: Record<string, {
    caption: string;
    hashtags: string[];
    cta: string;
    bestPostingTime: string;
    reasoning: string;
  }> = {
    "Trendy F&B": {
      caption:
        "This isn't just food. This is a MOMENT. Our new drop just hit the menu and trust us -- your taste buds aren't ready. One bite and you'll understand why the line's out the door. Tag someone who needs to try this ASAP.",
      hashtags: [
        "#foodie", "#foodporn", "#instafood", "#yummy", "#delicious",
        "#foodstagram", "#foodlover", "#tasty", "#foodgasm", "#eeeeeats",
        "#foodphotography", "#nomnom", "#newmenu", "#limitededition",
        "#viralfood", "#trending", "#mustry", "#fooddrop", "#eatlocal",
        "#foodiesofinstagram",
      ],
      cta: "Tag your foodie bestie & come try it before it's gone!",
      bestPostingTime: "Tuesday 11am EST",
      reasoning:
        "Trendy F&B audiences respond best to hype-driven, FOMO-inducing copy with bold language. Tuesday mid-morning catches the lunch-planning scroll.",
    },
    "Luxury Brand": {
      caption:
        "Crafted for those who appreciate the extraordinary. Every detail speaks to a legacy of uncompromising excellence -- because true luxury is never rushed, only refined. Discover what sets us apart.",
      hashtags: [
        "#luxury", "#luxurylifestyle", "#premium", "#exclusive", "#elegant",
        "#sophisticated", "#highend", "#craftsmanship", "#timeless", "#bespoke",
        "#luxurybrand", "#refinedliving", "#artisanal", "#heritage", "#opulence",
        "#discerning", "#curated", "#luxurydesign", "#masterpiece", "#iconic",
      ],
      cta: "Explore the collection -- link in bio.",
      bestPostingTime: "Wednesday 7pm EST",
      reasoning:
        "Luxury audiences engage with aspirational, refined language. Evening posts on Wednesday capture the mid-week indulgence mindset when affluent users browse leisurely.",
    },
    "Casual Ecom": {
      caption:
        "Okay real talk -- this one's been flying off the shelves and we totally get why. Comfy, cute, and crazy affordable? Yes please. Grab yours before we sell out (again).",
      hashtags: [
        "#shopnow", "#onlineshopping", "#musthave", "#bestdeal", "#trending",
        "#affordablestyle", "#shopsmall", "#newdrop", "#obsessed", "#addtocart",
        "#instashop", "#dealoftheday", "#styletip", "#fashionfinds", "#sale",
        "#budgetfriendly", "#treatyourself", "#bestseller", "#restocked",
        "#shoppingspree",
      ],
      cta: "Tap the link in bio to shop -- free shipping today only!",
      bestPostingTime: "Thursday 12pm EST",
      reasoning:
        "Casual ecom shoppers respond to relatable, conversational tone with urgency signals. Lunchtime Thursday captures payday-adjacent browsing behavior.",
    },
  };

  const key = persona.name;
  if (key in demoByTone) {
    return demoByTone[key];
  }

  // Generic fallback for unknown personas
  return {
    caption: `Check out our latest -- crafted with ${persona.tone} vibes just for you. This one's special and we can't wait for you to see it. Double tap if you love it!`,
    hashtags: [
      "#newpost", "#instadaily", "#instagood", "#photooftheday", "#trending",
      "#viral", "#explore", "#contentcreator", "#brandnew", "#mustsee",
      "#amazing", "#love", "#beautiful", "#style", "#inspiration",
      "#motivation", "#lifestyle", "#followus", "#share", "#community",
    ],
    cta: "Follow us for more & tap the link in bio!",
    bestPostingTime: "Tuesday 11am EST",
    reasoning: `Generated demo content tailored to ${persona.tone} tone. Optimized for mid-morning engagement when Instagram usage peaks.`,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, persona: personaName, imageDescription } = body;

    if (!prompt || !personaName) {
      return NextResponse.json(
        { error: "Missing required fields: prompt, persona" },
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

    const apiKey = process.env.MINIMAX_API_KEY;

    // If no API key, return realistic demo data
    if (!apiKey) {
      console.log("No MINIMAX_API_KEY configured -- returning demo content for", persona.name);
      return NextResponse.json(getDemoContent(persona));
    }

    const systemPrompt = `You are an expert Instagram marketing copywriter for a ${persona.name} brand. Tone: ${persona.tone}. Emoji style: ${persona.emoji_style}. Generate engaging Instagram content.

You MUST respond with valid JSON only, no markdown, no code fences. Use this exact structure:
{
  "caption": "string - engaging Instagram caption",
  "hashtags": ["array", "of", "15-20", "relevant", "hashtags"],
  "cta": "string - compelling call to action",
  "bestPostingTime": "string - e.g. Tuesday 11am EST",
  "reasoning": "string - brief explanation of strategy"
}`;

    const userPrompt = `Create an Instagram post for this brief:

Prompt: ${prompt}
Brand persona: ${persona.name} (tone: ${persona.tone}, emoji style: ${persona.emoji_style})${imageDescription ? `\nImage description: ${imageDescription}` : ""}

Generate a high-engagement Instagram caption with hashtags, CTA, and posting recommendation. Respond with JSON only.`;

    try {
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
        console.error("AI API error:", response.status, await response.text());
        return NextResponse.json(getDemoContent(persona));
      }

      const aiResponse = await response.json();
      const textContent = aiResponse.choices?.[0]?.message?.content;

      if (!textContent) {
        console.error("Empty AI response, falling back to demo content");
        return NextResponse.json(getDemoContent(persona));
      }

      // Parse AI response -- handle potential markdown code fences
      let parsed;
      try {
        const cleaned = textContent
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse AI JSON response, falling back to demo");
        return NextResponse.json(getDemoContent(persona));
      }

      return NextResponse.json({
        caption: parsed.caption || "",
        hashtags: parsed.hashtags || [],
        cta: parsed.cta || "",
        bestPostingTime: parsed.bestPostingTime || "Tuesday 11am EST",
        reasoning: parsed.reasoning || "",
      });
    } catch (fetchError) {
      console.error("AI fetch failed, returning demo content:", fetchError);
      return NextResponse.json(getDemoContent(persona));
    }
  } catch (error) {
    console.error("Error generating copy:", error);
    return NextResponse.json(
      {
        error: "Failed to generate copy",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
