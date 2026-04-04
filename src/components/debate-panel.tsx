"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Zap,
  PenTool,
  Shield,
  TrendingUp,
  Users,
  ArrowDown,
} from "lucide-react";
import type { AgentMessage, AgentRole } from "@/lib/agents/types";

/* ------------------------------------------------------------------ */
/*  Agent visual config — colors, avatars, labels                     */
/* ------------------------------------------------------------------ */

const AGENT_VISUAL: Record<
  AgentRole,
  { avatar: string; color: string; label: string }
> = {
  marketing_head: { avatar: "\uD83C\uDFAF", color: "#f59e0b", label: "Marketing Head" },
  content_creator: { avatar: "\u270D\uFE0F", color: "#6366f1", label: "Content Creator" },
  critic_brand: { avatar: "\uD83D\uDEE1\uFE0F", color: "#ef4444", label: "Brand Critic" },
  critic_engagement: { avatar: "\uD83D\uDCC8", color: "#f97316", label: "Engagement Critic" },
  review_council: { avatar: "\uD83D\uDC51", color: "#22c55e", label: "Review Council" },
};

/* ------------------------------------------------------------------ */
/*  Status badge config                                               */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  idle: {
    label: "Idle",
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.12)",
    border: "rgba(156,163,175,0.25)",
    icon: MessageSquare,
  },
  strategizing: {
    label: "Strategizing",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    icon: Zap,
  },
  drafting: {
    label: "Drafting",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.3)",
    icon: PenTool,
  },
  critiquing: {
    label: "Critiquing",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.3)",
    icon: AlertTriangle,
  },
  revising: {
    label: "Revising",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.3)",
    icon: PenTool,
  },
  approving: {
    label: "Approving",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    icon: CheckCircle2,
  },
  complete: {
    label: "Complete",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.35)",
    icon: CheckCircle2,
  },
};

/* ------------------------------------------------------------------ */
/*  Message-type pill config                                          */
/* ------------------------------------------------------------------ */

const TYPE_PILL: Record<
  AgentMessage["type"],
  { label: string; color: string; bg: string }
> = {
  strategy: { label: "Strategy", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  draft: { label: "Draft", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  critique: { label: "Critique", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  revision: { label: "Revision", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  approval: { label: "Approval", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  system: { label: "System", color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
};

/* ------------------------------------------------------------------ */
/*  Connecting-dots flow animation                                    */
/* ------------------------------------------------------------------ */

function FlowDots() {
  return (
    <div className="flex items-center justify-center gap-1 py-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1 w-1 rounded-full bg-[var(--accent)]"
          style={{
            opacity: 0.4,
            animation: "flowPulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 200}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single message bubble                                             */
/* ------------------------------------------------------------------ */

function MessageBubble({
  message,
  isNew,
}: {
  message: AgentMessage;
  isNew: boolean;
}) {
  const agent = AGENT_VISUAL[message.agent];
  const pill = TYPE_PILL[message.type];
  const isCritique = message.type === "critique";
  const isApproval = message.type === "approval";

  // Border color logic: critique = red-ish, approval = green glow, otherwise agent color
  let borderColor = `${agent.color}33`; // 20% opacity default
  if (isCritique) borderColor = "rgba(239,68,68,0.35)";
  if (isApproval) borderColor = "rgba(34,197,94,0.45)";

  // Glow for approval
  const glowShadow = isApproval
    ? "0 0 20px rgba(34,197,94,0.15), 0 0 40px rgba(34,197,94,0.05)"
    : "none";

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3 transition-all duration-500"
      style={{
        background: isCritique
          ? "linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(26,26,46,0.8) 100%)"
          : isApproval
            ? "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(26,26,46,0.8) 100%)"
            : "rgba(26,26,46,0.6)",
        border: `1px solid ${borderColor}`,
        boxShadow: glowShadow,
        animation: isNew ? "slideUp 0.4s ease-out, fadeIn 0.4s ease-out" : undefined,
      }}
    >
      {/* Agent avatar circle */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{
          background: `${agent.color}20`,
          border: `2px solid ${agent.color}50`,
        }}
      >
        {agent.avatar}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Name + type pill row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-bold"
            style={{ color: agent.color }}
          >
            {message.agentName}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: pill.color, backgroundColor: pill.bg }}
          >
            {pill.label}
          </span>

          {/* Score badge */}
          {message.metadata?.score != null && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                color:
                  message.metadata.score >= 8
                    ? "#22c55e"
                    : message.metadata.score >= 5
                      ? "#f59e0b"
                      : "#ef4444",
                backgroundColor:
                  message.metadata.score >= 8
                    ? "rgba(34,197,94,0.15)"
                    : message.metadata.score >= 5
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(239,68,68,0.15)",
              }}
            >
              {message.metadata.score}/10
            </span>
          )}

          {/* Approved checkmark */}
          {message.metadata?.approved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(34,197,94,0.15)] px-2 py-0.5 text-[10px] font-bold text-[#22c55e]">
              <CheckCircle2 className="h-3 w-3" />
              Approved
            </span>
          )}
        </div>

        {/* Message content */}
        <p className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Success / Completion banner                                       */
/* ------------------------------------------------------------------ */

function CompleteBanner() {
  return (
    <div
      className="relative overflow-hidden rounded-xl px-5 py-4 text-center"
      style={{
        background: "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(99,102,241,0.1) 100%)",
        border: "1px solid rgba(34,197,94,0.3)",
        boxShadow: "0 0 30px rgba(34,197,94,0.1), 0 0 60px rgba(34,197,94,0.05)",
      }}
    >
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full"
            style={{
              backgroundColor: i % 3 === 0 ? "#22c55e" : i % 3 === 1 ? "#6366f1" : "#f59e0b",
              left: `${(i * 8.3) % 100}%`,
              top: `${(i * 13.7) % 100}%`,
              opacity: 0.6,
              animation: `confettiFloat ${2 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative flex items-center justify-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(34,197,94,0.2)] border border-[rgba(34,197,94,0.3)]">
          <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#22c55e]">
            Debate Complete — Content Approved
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            All agents have reached consensus
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex items-center gap-3">
        {Object.values(AGENT_VISUAL).map(({ avatar, color }, i) => (
          <div
            key={i}
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg agent-pulse"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}30`,
              animationDelay: `${i * 400}ms`,
            }}
          >
            {avatar}
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-400 font-medium">
        Waiting for agents to begin...
      </p>
      <div className="flex items-center gap-1.5 mt-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] agent-pulse"
            style={{ animationDelay: `${i * 300}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main DebatePanel component                                        */
/* ------------------------------------------------------------------ */

interface DebatePanelProps {
  messages: AgentMessage[];
  status: string;
}

export default function DebatePanel({ messages, status }: DebatePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prevCount, setPrevCount] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevCount && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    setPrevCount(messages.length);
  }, [messages.length, prevCount]);

  // Show "scroll to bottom" button when user scrolls up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function handleScroll() {
      if (!el) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      setShowScrollBtn(!atBottom);
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.idle;
  const BadgeIcon = badge.icon;

  return (
    <div
      className="glass-card flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(26,26,46,0.9) 0%, rgba(16,16,32,0.95) 100%)",
        maxHeight: "680px",
      }}
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--accent-light)]" />
            <h2 className="text-sm font-bold tracking-wide text-[var(--foreground)]">
              Agency Debate
            </h2>
          </div>
          {messages.length > 0 && (
            <span className="text-[10px] text-gray-500 tabular-nums">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Status badge */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{
            color: badge.color,
            backgroundColor: badge.bg,
            border: `1px solid ${badge.border}`,
          }}
        >
          <BadgeIcon
            className="h-3 w-3"
            style={{
              animation:
                status !== "complete" && status !== "idle"
                  ? "agent-pulse 2s ease-in-out infinite"
                  : undefined,
            }}
          />
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            {badge.label}
          </span>
          {status === "complete" && (
            <CheckCircle2 className="h-3 w-3 text-[#22c55e]" />
          )}
        </div>
      </div>

      {/* ---- Message feed ---- */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--surface-light) transparent",
        }}
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={msg.id}>
                <MessageBubble
                  message={msg}
                  isNew={idx >= prevCount - 1 && idx === messages.length - 1}
                />
                {/* Flow dots between messages (not after last) */}
                {idx < messages.length - 1 && <FlowDots />}
              </div>
            ))}

            {/* Completion banner */}
            {status === "complete" && (
              <div className="mt-3">
                <CompleteBanner />
              </div>
            )}
          </>
        )}

        {/* Scroll-to-bottom floating button */}
        {showScrollBtn && (
          <button
            onClick={() =>
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
              })
            }
            className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium text-gray-300 transition-all hover:text-white"
            style={{
              backgroundColor: "rgba(37,37,66,0.9)",
              border: "1px solid var(--border)",
              backdropFilter: "blur(8px)",
            }}
          >
            <ArrowDown className="h-3 w-3" />
            New messages
          </button>
        )}
      </div>

      {/* ---- Keyframe styles ---- */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes flowPulse {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.5);
          }
        }

        @keyframes confettiFloat {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-8px) scale(1.4);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
