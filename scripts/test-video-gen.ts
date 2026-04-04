/**
 * MiniMax Hailuo Video Generation Test Script
 *
 * Generates a short video from an image using MiniMax Hailuo 02 (image-to-video).
 * Run with: npx tsx scripts/test-video-gen.ts
 *
 * Flow:
 *   1. Submit image + prompt to video generation endpoint
 *   2. Receive task_id
 *   3. Poll task status until Success or Fail
 *   4. Retrieve file download URL via file_id
 *   5. Download video to /tmp
 */

import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Load from .env.local (same dir as project root)
const ENV_PATH = resolve(import.meta.dirname ?? ".", "../.env.local");

async function loadEnv(): Promise<void> {
  try {
    const content = await readFile(ENV_PATH, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env.local not found; rely on existing env vars
  }
}

// MiniMax international endpoint (with trailing 'i')
// IMPORTANT: api.minimax.chat (without i) returns "invalid api key" for international keys
const BASE_URL = "https://api.minimaxi.chat";

// Model options for image-to-video:
//   "MiniMax-Hailuo-02"      - Hailuo 02 (good balance of quality/speed)
//   "MiniMax-Hailuo-2.3"     - Latest, highest quality
//   "MiniMax-Hailuo-2.3-Fast"- Faster variant of 2.3
//   "I2V-01"                 - Legacy model
const MODEL = "MiniMax-Hailuo-02";

// Duration: 6 or 10 seconds (10s only at 512P/768P for Hailuo-02)
const DURATION = 6;

// Resolution: "512P", "768P", or "1080P"
const RESOLUTION = "768P";

// Polling interval in ms
const POLL_INTERVAL_MS = 10_000;

// Maximum polling time (5 minutes)
const MAX_POLL_MS = 5 * 60 * 1000;

const OUTPUT_PATH = resolve("/tmp/test-video-gen.mp4");

// ---------------------------------------------------------------------------
// Test image (public URL of a food photo — replace with your own)
// ---------------------------------------------------------------------------

const TEST_IMAGE_URL =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

const VIDEO_PROMPT =
  "Slow cinematic zoom into this beautifully plated dish, " +
  "warm golden light gently shifting across the surface, " +
  "steam rising delicately. Shallow depth of field. " +
  "Professional food videography, Instagram Reel style. [Push in]";

// ---------------------------------------------------------------------------
// API Types
// ---------------------------------------------------------------------------

interface TaskCreateResponse {
  task_id: string;
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

interface TaskQueryResponse {
  task_id: string;
  status: "Preparing" | "Queueing" | "Processing" | "Success" | "Fail";
  file_id?: string;
  video_width?: number;
  video_height?: number;
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

interface FileRetrieveResponse {
  file: {
    file_id: number;
    bytes: number;
    created_at: number;
    filename: string;
    purpose: string;
    download_url: string;
  };
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new Error(
      "MINIMAX_API_KEY not found. Set it in .env.local or as an environment variable."
    );
  }
  return key;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Step 1: Submit video generation task
// ---------------------------------------------------------------------------

async function createVideoTask(apiKey: string): Promise<string> {
  const url = `${BASE_URL}/v1/video_generation`;

  const body = {
    model: MODEL,
    first_frame_image: TEST_IMAGE_URL,
    prompt: VIDEO_PROMPT,
    prompt_optimizer: true,
    duration: DURATION,
    resolution: RESOLUTION,
  };

  console.log(`\n--- Step 1: Create Video Generation Task ---`);
  console.log(`Endpoint : ${url}`);
  console.log(`Model    : ${MODEL}`);
  console.log(`Duration : ${DURATION}s`);
  console.log(`Resolution: ${RESOLUTION}`);
  console.log(`Image    : ${TEST_IMAGE_URL.slice(0, 70)}...`);
  console.log(`Prompt   : "${VIDEO_PROMPT.slice(0, 80)}..."`);

  const startTime = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const data: TaskCreateResponse = await response.json();

  console.log(`\nResponse (${elapsed}s):`);
  console.log(JSON.stringify(data, null, 2));

  if (data.base_resp.status_code !== 0) {
    throw new Error(
      `Task creation failed: [${data.base_resp.status_code}] ${data.base_resp.status_msg}`
    );
  }

  console.log(`\nTask created! task_id = ${data.task_id}`);
  return data.task_id;
}

// ---------------------------------------------------------------------------
// Step 2: Poll for completion
// ---------------------------------------------------------------------------

async function pollTaskStatus(
  apiKey: string,
  taskId: string
): Promise<{ fileId: string; width: number; height: number }> {
  const url = `${BASE_URL}/v1/query/video_generation?task_id=${taskId}`;

  console.log(`\n--- Step 2: Polling Task Status ---`);
  console.log(`Endpoint : ${url}`);
  console.log(`Interval : ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`Timeout  : ${MAX_POLL_MS / 1000}s\n`);

  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < MAX_POLL_MS) {
    pollCount++;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data: TaskQueryResponse = await response.json();
    const status = data.status;

    console.log(
      `  [Poll #${pollCount}] ${elapsed}s elapsed — status: ${status}`
    );

    if (status === "Success") {
      if (!data.file_id) {
        throw new Error("Task succeeded but no file_id returned");
      }
      console.log(`\nVideo generation complete!`);
      console.log(`  file_id : ${data.file_id}`);
      console.log(`  size    : ${data.video_width}x${data.video_height}`);
      return {
        fileId: data.file_id,
        width: data.video_width ?? 0,
        height: data.video_height ?? 0,
      };
    }

    if (status === "Fail") {
      throw new Error(
        `Video generation failed: [${data.base_resp.status_code}] ${data.base_resp.status_msg}`
      );
    }

    // Still processing — wait and retry
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out after ${MAX_POLL_MS / 1000}s waiting for video generation`);
}

// ---------------------------------------------------------------------------
// Step 3: Retrieve download URL
// ---------------------------------------------------------------------------

async function getDownloadUrl(
  apiKey: string,
  fileId: string
): Promise<string> {
  const url = `${BASE_URL}/v1/files/retrieve?file_id=${fileId}`;

  console.log(`\n--- Step 3: Retrieve Video Download URL ---`);
  console.log(`Endpoint : ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data: FileRetrieveResponse = await response.json();

  console.log(`Response:`);
  console.log(JSON.stringify(data, null, 2));

  if (data.base_resp.status_code !== 0) {
    throw new Error(
      `File retrieve failed: [${data.base_resp.status_code}] ${data.base_resp.status_msg}`
    );
  }

  const downloadUrl = data.file.download_url;
  console.log(`\nDownload URL (valid 1 hour):`);
  console.log(`  ${downloadUrl.slice(0, 100)}...`);

  return downloadUrl;
}

// ---------------------------------------------------------------------------
// Step 4: Download video
// ---------------------------------------------------------------------------

async function downloadVideo(downloadUrl: string): Promise<void> {
  console.log(`\n--- Step 4: Download Video ---`);
  console.log(`Saving to: ${OUTPUT_PATH}`);

  const startTime = Date.now();
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(OUTPUT_PATH, buffer);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\nDownloaded in ${elapsed}s`);
  console.log(`File size: ${formatBytes(buffer.length)}`);
  console.log(`Saved to : ${OUTPUT_PATH}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log(" MiniMax Hailuo Video Generation Test");
  console.log(" Image-to-Video (I2V)");
  console.log("=".repeat(60));

  await loadEnv();
  const apiKey = getApiKey();
  console.log(`API Key  : ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);

  const totalStart = Date.now();

  try {
    // 1. Submit task
    const taskId = await createVideoTask(apiKey);

    // 2. Poll until done
    const { fileId, width, height } = await pollTaskStatus(apiKey, taskId);

    // 3. Get download URL
    const downloadUrl = await getDownloadUrl(apiKey, fileId);

    // 4. Download the video
    await downloadVideo(downloadUrl);

    // Summary
    const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
    console.log(`\n${"=".repeat(60)}`);
    console.log(` DONE — Total time: ${totalElapsed}s`);
    console.log(` Video: ${width}x${height}, ${DURATION}s, ${MODEL}`);
    console.log(` File:  ${OUTPUT_PATH}`);
    console.log(`${"=".repeat(60)}`);
  } catch (error) {
    const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
    console.error(`\nFAILED after ${totalElapsed}s`);
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
