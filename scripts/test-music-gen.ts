/**
 * MiniMax Music Generation Test Script
 *
 * Generates a short instrumental background music track suitable for
 * Instagram Reels using the MiniMax Music-2.5+ API.
 *
 * Run with: npx tsx scripts/test-music-gen.ts
 */

import { writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "YOUR_MINIMAX_API_KEY";

// International endpoint (with trailing 'i')
const API_BASE = "https://api.minimaxi.chat";
const ENDPOINT = `${API_BASE}/v1/music_generation`;

// Model: music-2.5+ is the latest, supports is_instrumental
const MODEL = "music-2.5+";

const OUTPUT_PATH = resolve("/tmp/test-music.mp3");

// Audio quality settings
const AUDIO_SETTINGS = {
  sample_rate: 44100,
  bitrate: 256000,
  format: "mp3",
} as const;

// ---------------------------------------------------------------------------
// Music prompt — upbeat background for a food Instagram Reel (~15 seconds)
// ---------------------------------------------------------------------------

const MUSIC_PROMPT = `
Upbeat, feel-good lo-fi hip hop beat with a warm acoustic guitar loop,
light percussion, and subtle jazzy piano chords. Perfect as background
music for a short food Instagram Reel. Bright, appetizing energy.
15 seconds, fade out at the end.
`.trim();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MusicGenerationRequest {
  model: string;
  prompt: string;
  is_instrumental: boolean;
  output_format: "hex" | "url";
  audio_setting: {
    sample_rate: number;
    bitrate: number;
    format: string;
  };
}

interface MusicGenerationResponse {
  data: {
    audio?: string; // hex-encoded audio when output_format=hex
    audio_url?: string; // URL when output_format=url
    status: number; // 1 = in progress, 2 = completed
  };
  trace_id: string;
  extra_info?: {
    music_duration?: number;
    music_sample_rate?: number;
    music_channel?: number;
    bitrate?: number;
    music_size?: number;
  };
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

async function generateMusic(prompt: string): Promise<Buffer> {
  const body: MusicGenerationRequest = {
    model: MODEL,
    prompt,
    is_instrumental: true,
    output_format: "hex",
    audio_setting: AUDIO_SETTINGS,
  };

  console.log(`\n--- MiniMax Music Generation Request ---`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Model   : ${MODEL}`);
  console.log(`Format  : ${AUDIO_SETTINGS.format} @ ${AUDIO_SETTINGS.sample_rate}Hz, ${AUDIO_SETTINGS.bitrate / 1000}kbps`);
  console.log(`Instrumental: true`);
  console.log(`Prompt  : "${prompt.slice(0, 100)}..."`);
  console.log();

  const startTime = Date.now();

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `MiniMax API HTTP error ${response.status}: ${errorBody}`
    );
  }

  const result: MusicGenerationResponse = await response.json();

  // Check API-level errors
  if (result.base_resp.status_code !== 0) {
    throw new Error(
      `MiniMax API error ${result.base_resp.status_code}: ${result.base_resp.status_msg}`
    );
  }

  console.log(`API responded in ${elapsed}s`);
  console.log(`Trace ID: ${result.trace_id}`);
  console.log(`Status  : ${result.data.status} (${result.data.status === 2 ? "completed" : "in progress"})`);

  if (result.extra_info) {
    const info = result.extra_info;
    if (info.music_duration != null) {
      console.log(`Duration: ${info.music_duration}s`);
    }
    if (info.music_sample_rate != null) {
      console.log(`Sample rate: ${info.music_sample_rate}Hz`);
    }
    if (info.bitrate != null) {
      console.log(`Bitrate : ${info.bitrate / 1000}kbps`);
    }
    if (info.music_size != null) {
      console.log(`Size    : ${formatBytes(info.music_size)}`);
    }
  }

  // Decode the hex-encoded audio data
  if (!result.data.audio) {
    throw new Error(
      "No audio data in response. Status: " + result.data.status
    );
  }

  const audioBuffer = Buffer.from(result.data.audio, "hex");
  return audioBuffer;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function estimateMp3Duration(fileSizeBytes: number, bitrateKbps: number): number {
  return (fileSizeBytes * 8) / (bitrateKbps * 1000);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== MiniMax Music Generation Test ===\n");
  console.log(`Prompt (${MUSIC_PROMPT.length} chars):`);
  console.log(`"${MUSIC_PROMPT}"\n`);

  try {
    const audioBuffer = await generateMusic(MUSIC_PROMPT);

    // Save to disk
    await writeFile(OUTPUT_PATH, audioBuffer);

    // Report results
    const fileInfo = await stat(OUTPUT_PATH);
    const estimatedDuration = estimateMp3Duration(fileInfo.size, AUDIO_SETTINGS.bitrate / 1000);

    console.log(`\n--- Result ---`);
    console.log(`Output file     : ${OUTPUT_PATH}`);
    console.log(`File size       : ${formatBytes(fileInfo.size)}`);
    console.log(`Est. duration   : ${formatDuration(estimatedDuration)} (based on ${AUDIO_SETTINGS.bitrate / 1000}kbps)`);
    console.log(`\nMusic generated successfully!`);
  } catch (error) {
    console.error("\nFailed to generate music:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
