import type { AgentConfig, AgentMessage, AgentRole } from "./types";
import type { PersonaConfig } from "@/lib/types";

// ---------------------------------------------------------------------------
// Agent Definitions
// ---------------------------------------------------------------------------

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    role: "marketing_head",
    name: "Marketing Head",
    avatar: "\u{1F3AF}",
    color: "#f59e0b",
    systemPrompt: `You are the Marketing Head of a boutique digital agency. Your job is to receive a creative brief and define the campaign strategy: tone direction, key themes, messaging pillars, dos and don'ts. Be opinionated and specific — vague strategy is useless strategy. Always reference the brand persona and target audience. Keep your response to 3-5 concise bullet points plus a one-line strategic direction.`,
  },
  {
    role: "content_creator",
    name: "Content Creator",
    avatar: "\u270D\uFE0F",
    color: "#3b82f6",
    systemPrompt: `You are a senior Instagram copywriter. You generate 3 distinct caption variants for every brief, each taking a different creative angle. Variant 1 should be safe/on-brand, Variant 2 should be bold/risky, Variant 3 should be hook-first/engagement-optimized. Each variant must include the caption text, a CTA, and suggested hashtags. Label them clearly as Variant 1, Variant 2, Variant 3.`,
  },
  {
    role: "critic_brand",
    name: "Brand Critic",
    avatar: "\u{1F50D}",
    color: "#a855f7",
    systemPrompt: `You are a brand consistency expert. Your ONLY job is to review caption variants and flag anything that is off-brand, off-tone, or risks diluting the brand identity. Be specific: quote the exact words or phrases that are problematic and explain WHY they clash with the brand positioning. Rate each variant 1-10 for brand consistency. Be constructively harsh — mediocre on-brand content is worse than no content.`,
  },
  {
    role: "critic_engagement",
    name: "Engagement Critic",
    avatar: "\u{1F4CA}",
    color: "#ec4899",
    systemPrompt: `You are an Instagram engagement optimization expert. You review caption variants purely for performance: hook strength (first line must stop the scroll), CTA effectiveness, hashtag relevance, caption length (ideal: 125-150 chars for feed, up to 2200 for carousel), emoji usage, and posting time. Rate each variant 1-10 for predicted engagement. Cite specific Instagram best practices in your feedback.`,
  },
  {
    role: "review_council",
    name: "Review Council",
    avatar: "\u2696\uFE0F",
    color: "#22c55e",
    systemPrompt: `You are the final decision maker — the Review Council. You synthesize feedback from the Brand Critic and Engagement Critic, weigh trade-offs, and either approve the best variant, request a specific revision, or approve a revised version. Your output must include: the final approved caption, final hashtags (15-20), final CTA, recommended posting time, and a brief rationale. Be decisive — the team is waiting.`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getAgentConfig(role: AgentRole): AgentConfig {
  const config = AGENT_CONFIGS.find((c) => c.role === role);
  if (!config) throw new Error(`Unknown agent role: ${role}`);
  return config;
}

function makeId(role: AgentRole): string {
  return `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildMessage(
  config: AgentConfig,
  content: string,
  type: AgentMessage["type"],
  metadata?: AgentMessage["metadata"],
): AgentMessage {
  return {
    id: makeId(config.role),
    agent: config.role,
    agentName: config.name,
    content,
    timestamp: Date.now(),
    type,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// AI Call (mirrors generate-copy route pattern)
// ---------------------------------------------------------------------------

async function callAgent(
  agentConfig: AgentConfig,
  userMessage: string,
  persona: PersonaConfig,
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    return getDemoResponse(agentConfig.role, persona);
  }

  try {
    const systemPrompt = `${agentConfig.systemPrompt}\n\nBrand persona: ${persona.name}\nTone: ${persona.tone}\nEmoji style: ${persona.emoji_style}`;

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
            { role: "user", content: userMessage },
          ],
          temperature: 0.9,
          max_tokens: 2048,
        }),
      },
    );

    if (!response.ok) {
      console.error(
        `[${agentConfig.name}] AI API error:`,
        response.status,
        await response.text(),
      );
      return getDemoResponse(agentConfig.role, persona);
    }

    const aiResponse = await response.json();
    const text = aiResponse.choices?.[0]?.message?.content;
    if (!text) {
      console.error(`[${agentConfig.name}] Empty AI response, using demo`);
      return getDemoResponse(agentConfig.role, persona);
    }
    return text;
  } catch (err) {
    console.error(`[${agentConfig.name}] AI fetch failed:`, err);
    return getDemoResponse(agentConfig.role, persona);
  }
}

// ---------------------------------------------------------------------------
// Demo / fallback responses (specific and realistic)
// ---------------------------------------------------------------------------

function getDemoResponse(role: AgentRole, persona: PersonaConfig): string {
  const demos: Record<string, Record<AgentRole, string>> = {
    "Trendy F&B": {
      marketing_head: `Strategy for this campaign:

- **Direction**: Bold, FOMO-driven, street-food energy. We're not a fine-dining brand -- we're the spot your group chat can't stop talking about.
- **Key themes**: Heat, exclusivity, limited-time, shareable moments. Lean into "you had to be there" energy.
- **Tone**: Hype beast meets foodie. Short punchy sentences. ALL CAPS for emphasis sparingly. Talk TO the audience, not at them.
- **Do**: Use slang (lowkey, bussin, no cap), stack emojis, create urgency with "limited drop" language.
- **Don't**: Sound corporate, use formal food descriptions ("artisanal blend of..."), or be preachy about ingredients.

One-line direction: Make them screenshot this post and send it to their group chat.`,

      content_creator: `Here are 3 caption variants:

**Variant 1 (Safe/On-brand):**
NEW DROP ALERT. Our spicy burger just hit the menu and it's already causing chaos. Crispy, saucy, and packing HEAT. You've been warned. Available this week only -- don't sleep on this one.

**Variant 2 (Bold/Risky):**
We made it too spicy. Like, our chef went rogue and now we legally can't stop him. The Inferno Burger is here, it's unhinged, and your mouth WILL hate you. But your soul? Your soul will thank us. Limited run. No regrets.

**Variant 3 (Hook-first/Engagement):**
POV: You just took a bite and now you're questioning every burger you've ever had. This is the one. The spicy one. The one your timeline is about to be flooded with. Tag someone who thinks they can handle it.`,

      critic_brand: `Brand consistency review:

**Variant 1: 7/10** -- Solid and safe. "Causing chaos" fits the hype tone. But "you've been warned" is a bit generic -- every spicy food post uses this. Needs a fresher take on the heat warning.

**Variant 2: 9/10** -- This IS the brand. "Chef went rogue" is exactly the unhinged energy Trendy F&B should own. "Your mouth WILL hate you" is bold without being off-putting. Love the personality.

**Variant 3: 6/10** -- "POV:" is on-trend but the phrase "questioning every burger you've ever had" sounds like a food blogger, not a street-food brand. Too polished. Also "your timeline is about to be flooded" -- that's us telling them what to think instead of letting FOMO do the work.

Recommendation: Variant 2 is strongest for brand identity. Variant 3 needs the most work.`,

      critic_engagement: `Engagement optimization review:

**Variant 1: 6/10** -- "NEW DROP ALERT" is a decent hook but overused on Instagram food accounts. Caption is 42 words -- good length for feed. No CTA though -- missing a tag/share prompt. The urgency ("this week only") helps but needs a direct ask.

**Variant 2: 8/10** -- "We made it too spicy" is a STRONG opening hook -- it creates curiosity. The humor increases share potential. At 51 words it's ideal. But still no explicit CTA -- add "Tag someone who needs to try this" at the end. The "no regrets" close is weak; end on action, not sentiment.

**Variant 3: 7/10** -- "POV:" format gets high saves on Reels but lower engagement on static feed posts. The tag CTA at the end is great for reach. However, 3 separate "the one" phrases slow the momentum. Trim to one punch.

Posting time recommendation: Tuesday 11:30am or Thursday 6pm EST for maximum food content engagement. Avoid weekends -- food content gets buried by lifestyle posts.`,

      review_council: `FINAL DECISION: Approved with revision.

Taking Variant 2 as the base (strongest brand voice + best hook) and incorporating the engagement feedback:

**APPROVED CAPTION:**
We made it too spicy. Like, our chef went rogue and now we legally can't stop him. The Inferno Burger is here, it's unhinged, and your mouth WILL hate you. But you'll come back for seconds -- they always do. Tag someone who thinks they can handle the heat.

**HASHTAGS:** #SpicyBurger #FoodDrop #NewMenu #BurgerLovers #SpicyFood #Foodie #FoodPorn #InstaFood #ViralFood #TrendingFood #EatLocal #FoodPhotography #BurgerOfTheDay #HotOnes #SpicyChallenge #FoodieFinds #Eeeeeats #FoodGasm #LimitedEdition #MustTry

**CTA:** Tag someone who thinks they can handle the heat

**BEST POSTING TIME:** Tuesday 11:30am EST

**Rationale:** Variant 2 scored highest for brand consistency (9/10) and had the strongest hook per engagement review. Added the tag CTA from Variant 3 to drive reach. Replaced the weak "no regrets" closer with "they always do" to maintain the cocky brand voice while creating social proof. Brand score: 9/10. Engagement prediction: 8/10.`,
    },

    "Luxury Brand": {
      marketing_head: `Strategy for this campaign:

- **Direction**: Aspirational restraint. Let the product speak -- our words frame it, they don't shout over it.
- **Key themes**: Craftsmanship, heritage, the art of slowing down. Tap into "quiet luxury" -- the audience that doesn't need to be convinced, just reminded.
- **Tone**: Understated elegance. Short, declarative sentences. No exclamation marks. No slang. Think Celine, not Fashion Nova.
- **Do**: Use negative space in copy (short lines, intentional pauses). Reference timelessness, legacy, curation.
- **Don't**: Use urgency tactics (limited time!), trend-chasing language, or more than 1-2 emojis total.

One-line direction: Make them feel like they already belong to this world -- they just need to come home to it.`,

      content_creator: `Here are 3 caption variants:

**Variant 1 (Safe/On-brand):**
Some things are worth the wait. Crafted with intention, designed to endure. This is not a trend. This is a statement.

**Variant 2 (Bold/Risky):**
You don't find luxury. It finds you. And once it does, everything else feels like noise. Welcome to the quiet.

**Variant 3 (Hook-first/Engagement):**
The details they'll never notice are the ones that matter most. Every stitch. Every fold. Every decision that said no to ordinary. Discover what sets us apart -- link in bio.`,

      critic_brand: `Brand consistency review:

**Variant 1: 8/10** -- Clean, confident, on-brand. "Not a trend, this is a statement" is strong positioning. However "some things are worth the wait" is a cliche that luxury brands have overused -- Hermes, Rolex, and every watchmaker has a version of this. Needs a fresher entry point.

**Variant 2: 7/10** -- The concept is excellent but "everything else feels like noise" risks sounding dismissive of the audience's other choices. Luxury brands invite, they don't lecture. "Welcome to the quiet" is beautiful and very on-brand.

**Variant 3: 9/10** -- "The details they'll never notice" is a masterclass hook for luxury. It speaks directly to the discerning buyer's identity. The triple repetition ("every stitch, every fold, every decision") builds beautifully. The CTA is clean and not desperate.

Recommendation: Variant 3 is the strongest for brand alignment. Variant 2's concept could be refined.`,

      critic_engagement: `Engagement optimization review:

**Variant 1: 5/10** -- Short captions work for luxury but this one lacks a hook. "Some things are worth the wait" won't stop anyone from scrolling -- it's too familiar. No CTA, no engagement prompt. Will get saves from loyal followers but zero discovery.

**Variant 2: 6/10** -- "You don't find luxury. It finds you." is a strong hook -- mysterious, provocative. But no CTA at all. For luxury, even a subtle "Explore the collection" drives 23% more profile visits per Sprout Social data. Caption is too short to rank in Instagram's search algorithm.

**Variant 3: 8/10** -- Best hook of the three -- "the details they'll never notice" creates intrigue AND targets the luxury buyer's psychology (they want to be the one who DOES notice). Good length for saves. The "link in bio" CTA is functional but consider "Explore the craft" for a more on-brand CTA.

Posting time: Wednesday 7-8pm EST. Luxury audience browses in the evening wind-down. Avoid morning posts -- aspirational content underperforms before noon.`,

      review_council: `FINAL DECISION: Approved.

Taking Variant 3 as the base with minor CTA refinement per engagement feedback:

**APPROVED CAPTION:**
The details they'll never notice are the ones that matter most. Every stitch. Every fold. Every decision that said no to ordinary. Explore the craft.

**HASHTAGS:** #Luxury #Craftsmanship #Timeless #Elegant #HighEnd #QuietLuxury #Premium #Heritage #Bespoke #Refined #LuxuryLifestyle #Artisanal #DetailsMatter #LuxuryDesign #Exclusive #Sophisticated #MadeToLast #CuratedLiving #Prestige #Iconic

**CTA:** Explore the craft -- link in bio

**BEST POSTING TIME:** Wednesday 7:30pm EST

**Rationale:** Variant 3 achieved highest scores across both critics (brand: 9/10, engagement: 8/10). Replaced "Discover what sets us apart -- link in bio" with the more refined "Explore the craft" per engagement critic's suggestion. The hook is strong, the rhythm is elegant, and it speaks to the luxury buyer's identity without trying too hard. Brand score: 9/10. Engagement prediction: 8/10.`,
    },

    "Casual E-com": {
      marketing_head: `Strategy for this campaign:

- **Direction**: Best-friend energy. We're the friend who texts you "OMG you NEED this" with a link. Relatable, real, and a little chaotic in the best way.
- **Key themes**: Value, relatability, treat-yourself moments, social proof ("everyone's grabbing this"). Lean into "found a gem" discovery energy.
- **Tone**: Conversational and excited, like a group chat recommendation. Use "real talk," "honestly," "okay but." Contractions always.
- **Do**: Create urgency (selling fast, limited stock), use social proof language, add a clear shopping CTA.
- **Don't**: Sound like a corporate ad, use stiff product descriptions, or forget the CTA -- every post must drive to link in bio.

One-line direction: Make them feel like they're getting insider access to the best deal their feed has ever served them.`,

      content_creator: `Here are 3 caption variants:

**Variant 1 (Safe/On-brand):**
Okay real talk -- this one's been flying off the shelves and we totally get why. Comfy, cute, and crazy affordable? Yes please. Grab yours before we sell out (again).

**Variant 2 (Bold/Risky):**
We probably shouldn't tell you this but... this is the product our team fights over in the office. Like, actual debates. HR got involved. It's THAT good. And right now it's 30% off. You're welcome.

**Variant 3 (Hook-first/Engagement):**
Stop scrolling. No seriously. This is the thing you didn't know you needed but you absolutely do. 4.8 stars. 2,000+ sold. And it just got restocked. Link in bio before it's gone AGAIN.`,

      critic_brand: `Brand consistency review:

**Variant 1: 8/10** -- Classic Casual E-com voice. "Okay real talk" is a perfect opener for this brand. "Comfy, cute, and crazy affordable" hits the value messaging. Solid but safe -- won't break through the noise.

**Variant 2: 9/10** -- "HR got involved" is hilarious and very shareable. The insider/behind-the-scenes angle is perfect for Casual E-com -- it makes the brand feel human. "You're welcome" as a closer is chef's kiss for this tone. Only concern: "we probably shouldn't tell you this" could be misread as clickbait by some audiences.

**Variant 3: 7/10** -- "Stop scrolling" is an aggressive hook that works for performance marketing but feels slightly off-brand for a "friendly" casual store. The social proof numbers (4.8 stars, 2000+ sold) are great but the overall tone is more "infomercial" than "friend recommendation." The brand should feel discovered, not sold.

Recommendation: Variant 2 is most distinctive and on-brand. Variant 3 needs softening.`,

      critic_engagement: `Engagement optimization review:

**Variant 1: 6/10** -- Decent but no hook in the first line. "Okay real talk" is conversational but doesn't create enough curiosity to stop the scroll. No specific numbers or social proof. The CTA is buried ("grab yours") -- needs to be more explicit with a link-in-bio mention.

**Variant 2: 8/10** -- EXCELLENT hook. "We probably shouldn't tell you this" triggers curiosity -- Instagram's algorithm favors posts that generate longer read times, and this copy pulls you through. The humor drives comments and shares. Adding "link in bio" to the end would complete the conversion funnel. 30% off creates urgency without feeling desperate.

**Variant 3: 7/10** -- "Stop scrolling" is a proven engagement hook. Social proof numbers are strong conversion drivers. But the aggressive stacking of tactics (urgency + scarcity + social proof + CTA) in one caption can feel overwhelming. Pick 2, not 4. The "AGAIN" in caps is good FOMO energy though.

Posting time: Thursday 12-1pm EST. Payday-adjacent + lunch break browsing = peak casual shopping behavior.`,

      review_council: `FINAL DECISION: Approved with revision.

Taking Variant 2 as the base and adding the missing CTA:

**APPROVED CAPTION:**
We probably shouldn't tell you this but... this is the product our team fights over in the office. Like, actual debates. HR got involved. It's THAT good. And right now it's 30% off. Link in bio -- you're welcome.

**HASHTAGS:** #ShopNow #OnlineShopping #MustHave #BestDeal #Trending #AffordableStyle #ShopSmall #NewDrop #Obsessed #AddToCart #InstaShop #DealOfTheDay #StyleTip #FashionFinds #Sale #BudgetFriendly #TreatYourself #BestSeller #Restocked #ShoppingSpree

**CTA:** Link in bio -- you're welcome

**BEST POSTING TIME:** Thursday 12pm EST

**Rationale:** Variant 2 won on brand voice (9/10) and engagement potential (8/10). The humor is shareable, the tone is distinctly "Casual E-com," and the behind-the-scenes angle builds brand personality. Moved "you're welcome" after the link-in-bio CTA so the last thing they read is the action + the cheeky closer. Brand score: 9/10. Engagement prediction: 8/10.`,
    },
  };

  // Check for exact persona match
  if (persona.name in demos) {
    return demos[persona.name][role];
  }

  // Fallback: generic but still specific per-role
  const fallback: Record<AgentRole, string> = {
    marketing_head: `Strategy for this ${persona.name} campaign:

- **Direction**: Lead with the brand's core identity -- ${persona.tone.split(".")[0].toLowerCase()}. Every word should feel intentional.
- **Key themes**: Authenticity, value proposition, community connection. Speak to the audience's aspirations.
- **Tone**: ${persona.tone}
- **Do**: Stay true to the ${persona.name} voice, use ${persona.emoji_style.toLowerCase()}, reference the target audience directly.
- **Don't**: Sound generic, ignore the brand persona, or forget a clear call-to-action.

One-line direction: Make every post feel like it was made specifically for this audience.`,

    content_creator: `Here are 3 caption variants:

**Variant 1 (Safe/On-brand):**
We put everything into this one. Designed for you, inspired by what matters most. Take a closer look -- we think you'll love what you see.

**Variant 2 (Bold/Risky):**
Forget everything you thought you knew. This changes the game and we're not even sorry about it. The only question is: are you in?

**Variant 3 (Hook-first/Engagement):**
This is the post you'll wish you saw sooner. One look and you'll get it. Trust us -- your future self will thank you. Drop a comment if you agree.`,

    critic_brand: `Brand consistency review:

**Variant 1: 7/10** -- Safe and reliable. Aligns with ${persona.name} positioning but lacks a distinctive hook. Could belong to any brand in this space.

**Variant 2: 6/10** -- The boldness is refreshing but "forget everything you thought you knew" may feel aggressive for the ${persona.name} audience. The confidence is good; the framing needs adjustment.

**Variant 3: 8/10** -- Good balance of engagement and brand voice. "Your future self will thank you" aligns with the aspirational tone. The comment CTA is appropriate.

Recommendation: Variant 3 is strongest. Variant 1 needs more personality.`,

    critic_engagement: `Engagement optimization review:

**Variant 1: 5/10** -- No hook in the first line. "We put everything into this" doesn't stop the scroll. Needs a more compelling opener and an explicit CTA.

**Variant 2: 7/10** -- "Forget everything you thought you knew" is a strong curiosity hook. The question at the end drives comments. But the middle section is vague -- add specifics.

**Variant 3: 7/10** -- "This is the post you'll wish you saw sooner" is a decent hook. The comment CTA at the end is smart for algorithm engagement. Could be shortened for better impact.

Posting time: Tuesday 11am or Wednesday 7pm EST based on the ${persona.name} audience engagement patterns.`,

    review_council: `FINAL DECISION: Approved with revision.

Combining Variant 3's structure with Variant 2's boldness:

**APPROVED CAPTION:**
This is the one you've been waiting for. One look and you'll get it -- we made this for people who know exactly what they want. Drop a comment if that's you.

**HASHTAGS:** #NewPost #InstaDaily #InstaGood #PhotoOfTheDay #Trending #Viral #Explore #ContentCreator #BrandNew #MustSee #Amazing #Love #Beautiful #Style #Inspiration #Motivation #Lifestyle #FollowUs #Share #Community

**CTA:** Drop a comment if that's you

**BEST POSTING TIME:** Tuesday 11am EST

**Rationale:** Combined the best elements -- Variant 3's engagement structure with Variant 2's confident energy. The final caption is punchy, has a clear hook, and ends with a comment-driving CTA. Brand score: 8/10. Engagement prediction: 7/10.`,
  };

  return fallback[role];
}

// ---------------------------------------------------------------------------
// Main Orchestrator — async generator that yields debate messages
// ---------------------------------------------------------------------------

export async function* runDebate(
  prompt: string,
  persona: PersonaConfig,
  imageDescription?: string,
): AsyncGenerator<AgentMessage> {
  const headConfig = getAgentConfig("marketing_head");
  const creatorConfig = getAgentConfig("content_creator");
  const brandCriticConfig = getAgentConfig("critic_brand");
  const engagementCriticConfig = getAgentConfig("critic_engagement");
  const councilConfig = getAgentConfig("review_council");

  // -----------------------------------------------------------------------
  // Step 1: Marketing Head defines strategy
  // -----------------------------------------------------------------------

  const strategyPrompt = `Here is the creative brief:

Prompt: ${prompt}
Brand: ${persona.name}
Brand description: ${persona.description}
Tone guidelines: ${persona.tone}
Emoji style: ${persona.emoji_style}
Hashtag style: ${persona.hashtag_style}${imageDescription ? `\nImage description: ${imageDescription}` : ""}

Define the campaign strategy: tone direction, key themes, messaging pillars, dos and don'ts. Be specific to this brand and brief.`;

  const strategyResponse = await callAgent(headConfig, strategyPrompt, persona);

  yield buildMessage(headConfig, strategyResponse, "strategy");

  // -----------------------------------------------------------------------
  // Step 2: Content Creator generates 3 variants
  // -----------------------------------------------------------------------

  const draftPrompt = `The Marketing Head has set this strategy:

${strategyResponse}

Original brief: ${prompt}
Brand: ${persona.name} (${persona.tone})${imageDescription ? `\nImage description: ${imageDescription}` : ""}

Generate 3 distinct Instagram caption variants following the strategy. Each variant should take a different angle. Include caption text, a CTA suggestion, and hashtag ideas for each.`;

  const draftResponse = await callAgent(creatorConfig, draftPrompt, persona);

  yield buildMessage(creatorConfig, draftResponse, "draft");

  // -----------------------------------------------------------------------
  // Step 3: Critics review in parallel (conceptually — we yield sequentially)
  // -----------------------------------------------------------------------

  const critiqueContext = `Here are the 3 caption variants to review:

${draftResponse}

Brand: ${persona.name}
Brand description: ${persona.description}
Tone: ${persona.tone}
Emoji style: ${persona.emoji_style}

Strategy set by Marketing Head:
${strategyResponse}`;

  // Run both critic calls concurrently
  const [brandCritique, engagementCritique] = await Promise.all([
    callAgent(
      brandCriticConfig,
      `${critiqueContext}\n\nReview each variant for brand consistency. Rate each 1-10 and flag specific issues.`,
      persona,
    ),
    callAgent(
      engagementCriticConfig,
      `${critiqueContext}\n\nReview each variant for Instagram engagement potential. Rate each 1-10 and provide specific optimization feedback.`,
      persona,
    ),
  ]);

  yield buildMessage(brandCriticConfig, brandCritique, "critique");
  yield buildMessage(engagementCriticConfig, engagementCritique, "critique");

  // -----------------------------------------------------------------------
  // Step 4: Content Creator revises based on feedback
  // -----------------------------------------------------------------------

  const revisionPrompt = `Your original caption variants:
${draftResponse}

Brand Critic feedback:
${brandCritique}

Engagement Critic feedback:
${engagementCritique}

Based on this feedback, create a REVISED final caption that combines the best elements and addresses the criticisms. Produce a single polished caption with CTA and hashtags.`;

  const revisionResponse = await callAgent(
    creatorConfig,
    revisionPrompt,
    persona,
  );

  yield buildMessage(creatorConfig, revisionResponse, "revision");

  // -----------------------------------------------------------------------
  // Step 5: Review Council makes final decision
  // -----------------------------------------------------------------------

  const councilPrompt = `Here is the full debate transcript:

STRATEGY (Marketing Head):
${strategyResponse}

ORIGINAL VARIANTS (Content Creator):
${draftResponse}

BRAND CRITIQUE:
${brandCritique}

ENGAGEMENT CRITIQUE:
${engagementCritique}

REVISED CAPTION (Content Creator):
${revisionResponse}

Brand: ${persona.name}

As the Review Council, make your final decision. Approve the revised caption or make final tweaks. Output the final approved caption, hashtags (15-20), CTA, recommended posting time, and your rationale with scores.`;

  const councilResponse = await callAgent(
    councilConfig,
    councilPrompt,
    persona,
  );

  yield buildMessage(councilConfig, councilResponse, "approval", {
    approved: true,
    score: 9,
  });
}
