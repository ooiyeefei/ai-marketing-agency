# AI Marketing Agency for E-Commerce & F&B

**Priority**: 2
**Tracks**: General, InsForge, MiniMax, ElevenLabs, Going Merry (via Lovable)
**Hackathon angle**: "Your AI marketing team argues so you don't have to — $3K/month agency replaced by agents"

## The Idea

Multi-agent AI marketing system for small e-commerce and F&B businesses. User snaps a product photo, types a prompt, selects a brand persona → an orchestrated team of AI agents produces ready-to-post Instagram content with debate and quality control.

**What makes it novel**: The visible multi-agent debate/review process. Users SEE the agents disagreeing, revising, and converging in real-time. Not a black box — a transparent AI agency.

---

## Phase 1: Lean MVP (Target: 3 hours)

**Goal**: Upload photo + prompt → AI generates 1 Instagram post (enhanced image + caption + hashtags)

Build ONLY:
1. Simple web form: photo upload + text prompt + persona selector (e.g., "Trendy F&B", "Luxury Brand", "Casual Ecom")
2. Image enhancement agent: takes raw photo → MiniMax image gen to enhance/stylize for Instagram
3. Copywriting agent: generates caption + hashtags + CTA optimized for the selected persona
4. Single output view: enhanced image + caption + hashtags + posting recommendation (best time)
5. InsForge backend: store brand profiles, generated content, images

**Demo checkpoint**: Snap a burger photo → get a polished Instagram post with caption and hashtags in 30 seconds

## Phase 2: Multi-Agent Debate (Target: 2 hours)

**Goal**: Show the "agency" — multiple agents debating content quality

6. Marketing Head agent: receives prompt → defines strategy/theme/tone guidelines
7. Content Creator agent: generates 2-3 caption variants
8. Critic agents (2): one checks brand consistency, other checks engagement optimization
9. **Debate panel UI**: real-time feed showing agent messages ("Caption too long for Instagram", "Needs stronger CTA", "On-brand")
10. Review Council: synthesizes debate → picks winner or requests revision → approves

**Demo checkpoint**: Upload photo → watch agents argue → see the approved result with explanation of WHY

## Phase 3: Rich Media & Calendar (Target: 2 hours)

**Goal**: Video reels + content calendar

11. **MiniMax video gen**: Generate 15-second Instagram Reel from product photo (Hailuo 02)
12. **ElevenLabs voiceover**: Narrate the reel with brand-appropriate voice
13. Content calendar view: schedule a week of posts from one session
14. **MiniMax music gen**: Background music for reels

**Demo checkpoint**: Full content package — image post + reel with voiceover + weekly calendar

---

## InsForge Integration Plan

- **Postgres**: Brand profiles, content history, generated assets metadata, agent debate logs
- **Auth**: Business owner login
- **Edge Functions**: Image processing pipeline trigger, agent orchestration
- **AI Gateway**: Route between MiniMax (images/video) and text models (copy)
- **Storage**: Uploaded photos, generated images, video reels
- **Realtime**: Live agent debate feed (websocket updates as agents "discuss")

## Agent Architecture

```
[User Input: photo + prompt + persona]
       |
       v
  Marketing Head Agent
  (strategy, tone, guidelines)
       |
       v
  Content Creator Agent ──→ generates 2-3 variants
       |
       v
  ┌─── Critic A (brand consistency)
  ├─── Critic B (engagement/platform rules)
  └─── outputs debate transcript
       |
       v
  Review Council Agent
  (synthesizes, scores, approves or revises)
       |
       v
  [Output: approved post + debate log]
```

## Tech Stack

- Frontend: Next.js + Tailwind (or Lovable scaffold)
- Backend: InsForge (Postgres, Edge Functions, AI Gateway, Storage)
- Image gen: MiniMax Image API
- Video gen: MiniMax Hailuo 02
- Voice: ElevenLabs TTS
- Music: MiniMax Music-1.5
- Text/reasoning: MiniMax M2.5 or Claude via InsForge AI Gateway

## 2-Minute Demo Script

- 0:00-0:15 — "Small businesses spend $3K/month on marketing agencies. We built the agency as AI agents."
- 0:15-0:35 — Snap a photo of a burger. Type "launch post for new spicy burger, fun and bold." Select "Trendy F&B" persona.
- 0:35-1:00 — Watch the debate panel: Marketing Head sets tone, Creator generates 3 options, Critics argue ("caption too long", "needs emoji", "CTA is weak")
- 1:00-1:20 — Council approves revised version. Show final: enhanced image + caption + hashtags + best posting time.
- 1:20-1:45 — Play the auto-generated 15-second Reel with MiniMax video + ElevenLabs voiceover.
- 1:45-2:00 — Show content calendar: "One session, one week of content. Your AI agency never sleeps."
