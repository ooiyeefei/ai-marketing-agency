"use client";

import { useState, useEffect } from "react";
import { Clock, Image as ImageIcon } from "lucide-react";
import { getSessions, type SavedSession } from "@/lib/session-storage";

interface SessionListProps {
  onLoadSession: (session: SavedSession) => void;
  refreshKey: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const personaColors: Record<string, string> = {
  trendy_fnb: "#f59e0b",
  luxury_brand: "#a855f7",
  casual_ecom: "#3b82f6",
  health_wellness: "#ec4899",
  tech_startup: "#22c55e",
};

export default function SessionList({ onLoadSession, refreshKey }: SessionListProps) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, [refreshKey]);

  if (sessions.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Past Sessions
        </p>
      </div>
      <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--surface-light) transparent" }}>
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onLoadSession(s)}
            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-light)]/50 transition-colors text-left border-b border-[var(--border)] last:border-b-0"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-[var(--surface)]">
              {s.enhancedImageUrl ? (
                <img src={s.enhancedImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: personaColors[s.persona] || "#9ca3af" }}
                />
                <p className="text-[11px] text-gray-400 truncate">
                  {s.prompt.slice(0, 50)}{s.prompt.length > 50 ? "..." : ""}
                </p>
              </div>
              <p className="text-[10px] text-gray-600 truncate">
                {s.caption?.slice(0, 60) || "No caption"}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-2.5 w-2.5 text-gray-600" />
                <span className="text-[9px] text-gray-600">{timeAgo(s.createdAt)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
