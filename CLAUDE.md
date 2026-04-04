# AI Marketing Agency — Development Guidelines

## Hackathon Rules (Agent Master Hack SF 2026-04-04)

### Parallel Agent Execution (MANDATORY)
- ALWAYS launch the MAXIMUM number of parallel agents for any task
- If 3+ independent subtasks exist, dispatch them ALL simultaneously via the Agent tool
- Never do sequential work when parallel is possible
- Use `run_in_background: true` for non-blocking research/builds
- Use `isolation: "worktree"` when agents need to edit files independently
- Batch all independent tool calls in a single message

### Project Context
- Multi-agent AI marketing system for e-commerce and F&B Instagram management
- Read `idea.md` for lean MVP phasing (Phase 1 → 2 → 3, don't overbuild)
- Backend: InsForge for all infra (Postgres, Auth, Edge Functions, AI Gateway, Storage, Realtime)
- Image/Video: MiniMax (Image gen, Hailuo 02 video, Music-1.5)
- Voice: ElevenLabs TTS for video voiceovers
- Tracks: General, InsForge, MiniMax, ElevenLabs, Going Merry

### Tech Stack
- Frontend: Next.js + Tailwind CSS (or Lovable scaffold)
- Backend: InsForge (Postgres, Edge Functions, AI Gateway, Storage)
- Image gen: MiniMax Image API
- Video gen: MiniMax Hailuo 02
- Voice: ElevenLabs TTS
- Text/reasoning: Claude or MiniMax M2.5 via InsForge AI Gateway

### Build Philosophy
- Build thinnest demo-able MVP first (Phase 1 in idea.md)
- STOP and validate at each phase checkpoint before proceeding
- Hackathon demo > production polish
- Use sponsor tools (InsForge, MiniMax, ElevenLabs) wherever possible
- The multi-agent debate visualization IS the wow factor — make it visible
