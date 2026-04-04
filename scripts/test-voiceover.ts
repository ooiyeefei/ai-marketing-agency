/**
 * ElevenLabs Text-to-Speech Test Script
 *
 * Generates a voiceover audio file from an Instagram caption using ElevenLabs TTS.
 * Run with: npx tsx scripts/test-voiceover.ts
 */

import { writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "YOUR_ELEVENLABS_API_KEY";

// Voice IDs (from ElevenLabs pre-made voices)
const VOICES = {
  rachel: "21m00Tcm4TlvDq8ikWAM",   // Rachel - warm, clear female
  sarah: "EXAVITQu4vr4xnSDxMaL",    // Sarah  - mature, reassuring, confident
  bella: "hpp4J3VqNfWAUOO0d1Us",     // Bella  - professional, bright, warm
  brian: "nPczCjzI2devNBz1zQrb",     // Brian  - deep, resonant, comforting
  matilda: "XrExE9yKIg1WjnnlVkGX",  // Matilda - knowledgeable, professional
} as const;

// Pick the voice to use for this test
const VOICE_ID = VOICES.sarah;
const VOICE_NAME = "Sarah";

// Model options:
//   eleven_multilingual_v2  - highest quality, multilingual (default)
//   eleven_turbo_v2_5       - low-latency, English-optimized
//   eleven_flash_v2_5       - fastest, good quality
const MODEL_ID = "eleven_multilingual_v2";

const OUTPUT_FORMAT = "mp3_44100_128"; // 128 kbps MP3 at 44.1 kHz
const OUTPUT_PATH = resolve("/tmp/test-voiceover.mp3");

// ---------------------------------------------------------------------------
// Sample Instagram caption (food / marketing content)
// ---------------------------------------------------------------------------

const SAMPLE_CAPTION = `
Craving something extraordinary? Our new Truffle Honey Glazed Salmon
is here to steal the spotlight. Wild-caught Atlantic salmon, drizzled
with Italian black truffle honey, finished with a hint of citrus zest.
Every bite is a moment you'll want to replay. Available this weekend
only -- tag someone who needs to taste this.
`.trim();

// ---------------------------------------------------------------------------
// ElevenLabs TTS API call
// ---------------------------------------------------------------------------

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  speed: number;
}

interface TTSRequest {
  text: string;
  model_id: string;
  voice_settings: VoiceSettings;
}

async function generateVoiceover(text: string): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`;

  const body: TTSRequest = {
    text,
    model_id: MODEL_ID,
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      speed: 1.0,
    },
  };

  console.log(`\n--- ElevenLabs TTS Request ---`);
  console.log(`Voice : ${VOICE_NAME} (${VOICE_ID})`);
  console.log(`Model : ${MODEL_ID}`);
  console.log(`Format: ${OUTPUT_FORMAT}`);
  console.log(`Text  : "${text.slice(0, 80)}..."`);
  console.log(`URL   : ${url}\n`);

  const startTime = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `ElevenLabs API error ${response.status}: ${errorBody}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  console.log(`API responded in ${elapsed}s`);
  console.log(`Content-Type: ${response.headers.get("content-type")}`);

  return audioBuffer;
}

// ---------------------------------------------------------------------------
// Audio info helpers
// ---------------------------------------------------------------------------

function estimateMp3Duration(fileSizeBytes: number, bitrateKbps: number): number {
  // duration (seconds) = file size (bits) / bitrate (bits per second)
  return (fileSizeBytes * 8) / (bitrateKbps * 1000);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== ElevenLabs TTS Voiceover Test ===\n");
  console.log(`Input caption (${SAMPLE_CAPTION.length} chars):`);
  console.log(`"${SAMPLE_CAPTION}"\n`);

  try {
    // Generate audio
    const audioBuffer = await generateVoiceover(SAMPLE_CAPTION);

    // Save to disk
    await writeFile(OUTPUT_PATH, audioBuffer);

    // Report results
    const fileInfo = await stat(OUTPUT_PATH);
    const estimatedDuration = estimateMp3Duration(fileInfo.size, 128);

    console.log(`\n--- Result ---`);
    console.log(`Output file     : ${OUTPUT_PATH}`);
    console.log(`File size       : ${formatBytes(fileInfo.size)}`);
    console.log(`Est. duration   : ${formatDuration(estimatedDuration)} (based on 128kbps)`);
    console.log(`\nVoiceover generated successfully!`);
  } catch (error) {
    console.error("\nFailed to generate voiceover:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
