"use client";

import { useEffect, useRef } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import type { AgentActivity as AgentActivityType } from "@/lib/types";

interface AgentActivityProps {
  activities: AgentActivityType[];
}

const STATUS_CONFIG = {
  thinking: {
    color: "var(--warning)",
    bgColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    label: "Thinking",
    pulse: true,
  },
  working: {
    color: "var(--accent-light)",
    bgColor: "rgba(99, 102, 241, 0.15)",
    borderColor: "rgba(99, 102, 241, 0.3)",
    label: "Working",
    pulse: true,
  },
  done: {
    color: "var(--success)",
    bgColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    label: "Done",
    pulse: false,
  },
  error: {
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    label: "Error",
    pulse: false,
  },
};

const AGENT_ICONS: Record<string, string> = {
  "Marketing Head": "M",
  "Image Enhancement Agent": "I",
  "Copywriting Agent": "C",
  "Hashtag Strategist": "H",
  "Scheduling Agent": "S",
};

function StatusIndicator({ status }: { status: AgentActivityType["status"] }) {
  const config = STATUS_CONFIG[status];

  if (status === "done") {
    return (
      <div
        className="flex h-5 w-5 items-center justify-center rounded-full"
        style={{ backgroundColor: config.bgColor, border: `1px solid ${config.borderColor}` }}
      >
        <Check className="h-3 w-3" style={{ color: config.color }} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
        style={{
          backgroundColor: config.bgColor,
          border: `1px solid ${config.borderColor}`,
          color: config.color,
        }}
      >
        &#10005;
      </div>
    );
  }

  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full agent-pulse"
      style={{ backgroundColor: config.bgColor, border: `1px solid ${config.borderColor}` }}
    >
      {status === "thinking" ? (
        <div className="flex gap-[2px]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 w-1 rounded-full animate-bounce"
              style={{
                backgroundColor: config.color,
                animationDelay: `${i * 150}ms`,
                animationDuration: "0.8s",
              }}
            />
          ))}
        </div>
      ) : (
        <Loader2
          className="h-3 w-3 animate-spin"
          style={{ color: config.color }}
        />
      )}
    </div>
  );
}

export default function AgentActivity({ activities }: AgentActivityProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  if (activities.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent-light)]" />
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Agent Activity
          </span>
        </div>
        <div className="flex items-center justify-center py-6">
          <p className="text-xs text-gray-600 italic">
            Agents standing by...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-[var(--accent-light)]" />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Agent Activity
        </span>
        <span className="ml-auto text-[10px] text-gray-600 tabular-nums">
          {activities.filter((a) => a.status === "done").length}/{activities.length} complete
        </span>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[240px] overflow-y-auto space-y-2 scrollbar-thin pr-1"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--surface-light) transparent",
        }}
      >
        {activities.map((activity, idx) => {
          const config = STATUS_CONFIG[activity.status];
          const initial =
            AGENT_ICONS[activity.agent] || activity.agent.charAt(0).toUpperCase();

          return (
            <div
              key={`${activity.agent}-${activity.timestamp}-${idx}`}
              className="flex items-start gap-3 rounded-lg p-2.5 transition-all duration-300"
              style={{
                backgroundColor:
                  activity.status === "done" || activity.status === "error"
                    ? "transparent"
                    : `${config.bgColor}`,
                animation:
                  idx === activities.length - 1 ? "fadeIn 0.3s ease-out" : undefined,
              }}
            >
              {/* Agent avatar */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
                style={{
                  backgroundColor: config.bgColor,
                  color: config.color,
                  border: `1px solid ${config.borderColor}`,
                }}
              >
                {initial}
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-300 truncate">
                  {activity.agent}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {activity.message}
                </p>
              </div>

              {/* Status */}
              <StatusIndicator status={activity.status} />
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
