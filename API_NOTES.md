# API Integration Notes (Agent Master Hack SF 2026)

## MiniMax API — WORKING

**Correct domain**: `api.minimaxi.chat` (with trailing **i** = international)
**Wrong domain**: `api.minimax.chat` (China endpoint — returns "invalid api key" for international keys)

### Text Generation
- **Endpoint**: `POST https://api.minimaxi.chat/v1/text/chatcompletion_v2`
- **Auth**: `Authorization: Bearer <MINIMAX_API_KEY>`
- **Model**: `MiniMax-Text-01`
- **Format**: OpenAI-compatible (messages array with system/user roles)
- **Response**: `response.choices[0].message.content`

### Image Generation (image-to-image with subject_reference)
- **Endpoint**: `POST https://api.minimaxi.chat/v1/image_generation`
- **Official docs endpoint**: `https://api.minimax.io/v1/image_generation` (both work)
- **Auth**: `Authorization: Bearer <MINIMAX_API_KEY>`
- **Model**: `image-01`
- **For i2i (keep original product)**: pass `subject_reference` array:
  ```json
  {
    "model": "image-01",
    "prompt": "Professional Instagram photo...",
    "subject_reference": [{ "type": "character", "image_file": "data:image/jpeg;base64,..." }],
    "aspect_ratio": "1:1",
    "prompt_optimizer": true
  }
  ```
- **For t2i (generate from scratch)**: omit `subject_reference`
- **Response**: `response.data.image_urls[0]`
- **Note**: Takes 10-20 seconds. Image URLs expire in 24h (OSS signed URL).
- **subject_reference.type**: only `"character"` supported (works for food/products too)
- **image_file**: accepts public URL or base64 data URI (`data:image/jpeg;base64,...`)

### Endpoints that DON'T work
- `/v1/image/generation` → 404
- `/v1/t2i_v2` → 404
- `api.minimax.chat` (without i) → "invalid api key" for international keys

---

## Gemini API — NOT WORKING (billing issue)

**Key**: (see .env.local)
**Error**: `429 RESOURCE_EXHAUSTED — "Your prepayment credits are depleted"`

### Root cause
- The $300 credits shown in Google **Cloud Console** are for Google Cloud services
- The Gemini API at `generativelanguage.googleapis.com` bills through **AI Studio**, which has separate billing
- AI Studio credits = $0 → 429 error even though Cloud credits = $300

### Fix options
1. Go to https://ai.studio/projects → add billing / link Google Cloud billing
2. Create API key from Google Cloud Console instead of AI Studio, and enable "Generative Language API"
3. Use Vertex AI endpoint instead (uses Cloud billing): `https://{region}-aiplatform.googleapis.com/v1/projects/{project-id}/locations/{region}/publishers/google/models/gemini-2.0-flash:generateContent` (requires OAuth, more complex)
4. **What we did**: Switched to MiniMax-Text-01 for all text generation instead

---

## Current Architecture (what's deployed)

- **All text gen**: MiniMax-Text-01 via `api.minimaxi.chat`
- **Image gen**: MiniMax image-01 via `api.minimaxi.chat`
- **Env var**: Only `MINIMAX_API_KEY` needed for both text and image
- **No Gemini dependency** — removed entirely
