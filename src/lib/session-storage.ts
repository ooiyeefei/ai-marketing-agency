/**
 * Client-side session persistence via localStorage.
 * Stores debate results, images, and variations so users can reload past runs.
 */

export interface SavedSession {
  id: string;
  persona: string;
  prompt: string;
  originalImageUrl: string;
  enhancedImageUrl: string;
  variations: Array<{ provider: string; label: string; dataUri: string }>;
  debateMessages: unknown[];
  caption: string;
  hashtags: string[];
  cta: string;
  bestPostingTime: string;
  createdAt: string;
}

const STORAGE_KEY = "ai-marketing-sessions";
const MAX_SESSIONS = 10;

export function getSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: Omit<SavedSession, "id" | "createdAt">): string {
  const sessions = getSessions();
  const id = crypto.randomUUID();
  const newSession: SavedSession = {
    ...session,
    id,
    createdAt: new Date().toISOString(),
  };

  // Add to front, trim to max
  sessions.unshift(newSession);
  if (sessions.length > MAX_SESSIONS) {
    sessions.length = MAX_SESSIONS;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  return id;
}

export function getSession(id: string): SavedSession | null {
  return getSessions().find((s) => s.id === id) || null;
}

export function updateSessionImages(
  id: string,
  enhancedImageUrl: string,
  variations: Array<{ provider: string; label: string; dataUri: string }>
) {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx >= 0) {
    sessions[idx].enhancedImageUrl = enhancedImageUrl;
    sessions[idx].variations = variations;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
}
