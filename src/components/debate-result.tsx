"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Hash,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Shield,
  Send,
} from "lucide-react";
import type { AgentMessage } from "@/lib/agents/types";

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface DebateResultProps {
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  bestPostingTime: string | null;
  enhancedImageUrl: string | null;
  styledImageUrl?: string | null;
  debateMessages: AgentMessage[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getDebateSummary(messages: AgentMessage[]): {
  totalMessages: number;
  critiques: number;
  revisions: number;
  finalScore: number | null;
} {
  const critiques = messages.filter((m) => m.type === "critique").length;
  const revisions = messages.filter((m) => m.type === "revision").length;
  const approvalMsg = messages.find(
    (m) => m.type === "approval" && m.metadata?.score != null
  );
  return {
    totalMessages: messages.length,
    critiques,
    revisions,
    finalScore: approvalMsg?.metadata?.score ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function DebateResult({
  caption,
  hashtags,
  cta,
  bestPostingTime,
  enhancedImageUrl,
  styledImageUrl,
  debateMessages,
}: DebateResultProps) {
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [debateOpen, setDebateOpen] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const displayImageUrl = showOriginal && styledImageUrl ? styledImageUrl : enhancedImageUrl;
  const hasToggle = styledImageUrl && styledImageUrl !== enhancedImageUrl;

  const summary = getDebateSummary(debateMessages);

  const handleCopyCaption = async () => {
    if (!caption) return;
    const text = cta ? `${caption}\n\n${cta}` : caption;
    await navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyHashtags = async () => {
    if (hashtags.length === 0) return;
    await navigator.clipboard.writeText(
      hashtags.map((h) => `#${h}`).join(" ")
    );
    setCopiedHashtags(true);
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  const truncatedCaption =
    caption && !captionExpanded && caption.length > 140
      ? caption.slice(0, 140) + "..."
      : caption;

  if (!caption && !enhancedImageUrl) {
    return null;
  }

  return (
    <div
      className="glass-card overflow-hidden transition-all duration-500"
      style={{
        boxShadow:
          "0 0 40px rgba(34,197,94,0.06), 0 0 80px rgba(99,102,241,0.04)",
      }}
    >
      {/* ---- "Approved by Review Council" badge ---- */}
      <div
        className="flex items-center justify-center gap-2.5 px-5 py-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(99,102,241,0.06) 100%)",
          borderBottom: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{
            backgroundColor: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
            boxShadow: "0 0 12px rgba(34,197,94,0.2)",
          }}
        >
          <Shield className="h-3 w-3 text-[#22c55e]" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#22c55e]">
          Approved by Review Council
        </span>
        {summary.finalScore != null && (
          <span
            className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{
              color:
                summary.finalScore >= 8
                  ? "#22c55e"
                  : summary.finalScore >= 5
                    ? "#f59e0b"
                    : "#ef4444",
              backgroundColor:
                summary.finalScore >= 8
                  ? "rgba(34,197,94,0.15)"
                  : summary.finalScore >= 5
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(239,68,68,0.15)",
            }}
          >
            Score: {summary.finalScore}/10
          </span>
        )}
      </div>

      {/* ---- Instagram post mockup header ---- */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            ai_marketing_agency
          </p>
          <p className="text-[10px] text-gray-500">Sponsored</p>
        </div>
      </div>

      {/* ---- Product image ---- */}
      {displayImageUrl && (
        <div className="relative aspect-square w-full bg-[var(--surface)]">
          <img
            src={displayImageUrl}
            alt="Product photo"
            className="h-full w-full object-cover"
          />
          {/* Image toggle + label */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            {hasToggle && (
              <button
                type="button"
                onClick={() => setShowOriginal((v) => !v)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all"
                style={{
                  backgroundColor: "rgba(10,10,10,0.75)",
                  backdropFilter: "blur(8px)",
                  border: showOriginal ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(99,102,241,0.5)",
                  color: showOriginal ? "#d1d5db" : "#818cf8",
                }}
              >
                <Sparkles className="h-3 w-3" />
                {showOriginal ? "Show AI Enhanced" : "Show Original"}
              </button>
            )}
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 ml-auto"
              style={{
                backgroundColor: "rgba(10,10,10,0.7)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              <Sparkles className="h-3 w-3 text-[var(--accent-light)]" />
              <span className="text-[10px] font-medium text-gray-300">
                {showOriginal ? "Original" : "AI Enhanced"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---- Instagram action row ---- */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Heart */}
          <svg
            className="h-6 w-6 text-[var(--foreground)] hover:text-red-500 transition-colors cursor-pointer"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          {/* Comment */}
          <svg
            className="h-6 w-6 text-[var(--foreground)] hover:text-gray-400 transition-colors cursor-pointer"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {/* Share */}
          <Send className="h-5 w-5 text-[var(--foreground)] hover:text-gray-400 transition-colors cursor-pointer" />
        </div>
        {/* Bookmark */}
        <svg
          className="h-6 w-6 text-[var(--foreground)] hover:text-gray-400 transition-colors cursor-pointer"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </div>

      {/* ---- Caption & content section ---- */}
      <div className="px-4 pb-4 space-y-3">
        {/* Caption */}
        {caption && (
          <div>
            <p className="text-sm leading-relaxed text-[var(--foreground)]">
              <span className="font-semibold mr-1.5">ai_marketing_agency</span>
              {truncatedCaption}
            </p>
            {caption.length > 140 && !captionExpanded && (
              <button
                onClick={() => setCaptionExpanded(true)}
                className="text-xs text-gray-500 hover:text-gray-400 mt-1 transition-colors"
              >
                Read more
              </button>
            )}
          </div>
        )}

        {/* CTA card */}
        {cta && (
          <div
            className="rounded-lg px-3.5 py-2.5"
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.08) 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <p className="text-xs font-semibold text-[var(--accent-light)]">
              {cta}
            </p>
          </div>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
                style={{ backgroundColor: "rgba(59,130,246,0.08)" }}
              >
                <Hash className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Best posting time */}
        {bestPostingTime && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Best time to post:{" "}
              <span className="text-[var(--foreground)] font-medium">
                {bestPostingTime}
              </span>
            </span>
          </div>
        )}

        {/* ---- Action buttons ---- */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleCopyCaption}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: copiedCaption
                ? "rgba(34,197,94,0.15)"
                : "var(--surface-light)",
              color: copiedCaption ? "#22c55e" : "#9ca3af",
              border: copiedCaption
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid transparent",
            }}
          >
            {copiedCaption ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Caption
              </>
            )}
          </button>

          <button
            onClick={handleCopyHashtags}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: copiedHashtags
                ? "rgba(34,197,94,0.15)"
                : "var(--surface-light)",
              color: copiedHashtags ? "#22c55e" : "#9ca3af",
              border: copiedHashtags
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid transparent",
            }}
          >
            {copiedHashtags ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Hash className="h-3.5 w-3.5" />
                Copy Hashtags
              </>
            )}
          </button>
        </div>

        {/* ---- Debate audit trail (collapsible) ---- */}
        {debateMessages.length > 0 && (
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <button
              onClick={() => setDebateOpen(!debateOpen)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
            >
              <MessageSquare className="h-3 w-3" />
              <span className="font-medium">View Full Debate</span>
              <span className="text-[10px] text-gray-600 tabular-nums">
                ({summary.totalMessages} messages
                {summary.critiques > 0 &&
                  ` \u00B7 ${summary.critiques} critique${summary.critiques !== 1 ? "s" : ""}`}
                {summary.revisions > 0 &&
                  ` \u00B7 ${summary.revisions} revision${summary.revisions !== 1 ? "s" : ""}`}
                )
              </span>
              {debateOpen ? (
                <ChevronUp className="ml-auto h-3 w-3" />
              ) : (
                <ChevronDown className="ml-auto h-3 w-3" />
              )}
            </button>

            {debateOpen && (
              <div
                className="mt-3 space-y-2 rounded-lg p-3 max-h-[320px] overflow-y-auto"
                style={{
                  backgroundColor: "rgba(16,16,32,0.6)",
                  border: "1px solid var(--border)",
                  scrollbarWidth: "thin",
                  scrollbarColor: "var(--surface-light) transparent",
                }}
              >
                {debateMessages.map((msg) => {
                  const roleColors: Record<string, string> = {
                    marketing_head: "#f59e0b",
                    content_creator: "#6366f1",
                    critic_brand: "#ef4444",
                    critic_engagement: "#f97316",
                    review_council: "#22c55e",
                  };
                  const color = roleColors[msg.agent] ?? "#9ca3af";

                  return (
                    <div
                      key={msg.id}
                      className="rounded-lg px-3 py-2"
                      style={{
                        backgroundColor: "rgba(26,26,46,0.5)",
                        borderLeft: `2px solid ${color}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[11px] font-bold"
                          style={{ color }}
                        >
                          {msg.agentName}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-gray-600 font-medium">
                          {msg.type}
                        </span>
                        {msg.metadata?.score != null && (
                          <span className="text-[9px] font-bold text-gray-500">
                            {msg.metadata.score}/10
                          </span>
                        )}
                        {msg.metadata?.approved && (
                          <CheckCircle2 className="h-3 w-3 text-[#22c55e]" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">
                        {msg.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
