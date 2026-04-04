"use client";

import { useState } from "react";
import {
  Clock,
  Hash,
  Copy,
  Check,
  Sparkles,
  Camera,
  Send,
} from "lucide-react";
import type { CreatePostResponse } from "@/lib/types";

interface PostPreviewProps {
  post: CreatePostResponse | null;
  isLoading: boolean;
}

const LOADING_STAGES = [
  { text: "Enhancing your photo...", icon: Camera },
  { text: "Crafting the perfect caption...", icon: Sparkles },
  { text: "Selecting hashtags...", icon: Hash },
];

function SkeletonState() {
  const [activeStage, setActiveStage] = useState(0);

  // Cycle through stages
  useState(() => {
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  });

  return (
    <div className="glass-card overflow-hidden">
      {/* Skeleton image */}
      <div className="relative aspect-square w-full bg-[var(--surface)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--surface-light)]/50 to-transparent animate-[shimmer_2s_infinite] translate-x-[-100%]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            {LOADING_STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = i === activeStage;
              const isDone = i < activeStage;
              return (
                <div
                  key={stage.text}
                  className={`
                    flex items-center gap-3 transition-all duration-500
                    ${isActive ? "opacity-100 scale-105" : isDone ? "opacity-40" : "opacity-20"}
                  `}
                >
                  <div
                    className={`
                      rounded-lg p-2 transition-colors duration-500
                      ${isActive ? "bg-[var(--accent)]/20 text-[var(--accent-light)]" : "bg-[var(--surface-light)] text-gray-600"}
                    `}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "animate-pulse" : ""}`} />
                  </div>
                  <span
                    className={`text-sm ${isActive ? "text-[var(--foreground)]" : "text-gray-600"}`}
                  >
                    {stage.text}
                  </span>
                  {isDone && <Check className="h-3 w-3 text-[var(--success)]" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Skeleton content */}
      <div className="p-5 space-y-3">
        <div className="h-3 w-3/4 rounded bg-[var(--surface-light)] animate-pulse" />
        <div className="h-3 w-full rounded bg-[var(--surface-light)] animate-pulse delay-100" />
        <div className="h-3 w-1/2 rounded bg-[var(--surface-light)] animate-pulse delay-200" />
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-6 w-16 rounded-full bg-[var(--surface-light)] animate-pulse"
              style={{ animationDelay: `${n * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PostPreview({ post, isLoading }: PostPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  if (isLoading) return <SkeletonState />;

  if (!post) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="mb-4 rounded-2xl bg-[var(--surface-light)] p-5">
          <Camera className="h-8 w-8 text-gray-600" />
        </div>
        <p className="text-sm text-gray-500">
          Your Instagram post preview will appear here
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Upload a photo and let the agents work their magic
        </p>
      </div>
    );
  }

  const handleCopy = async () => {
    const text = `${post.caption}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}\n\n${post.cta}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedCaption =
    !captionExpanded && post.caption.length > 120
      ? post.caption.slice(0, 120) + "..."
      : post.caption;

  return (
    <div className="glass-card overflow-hidden transition-all duration-500 animate-in fade-in">
      {/* Instagram post header */}
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

      {/* Enhanced image */}
      <div className="relative aspect-square w-full bg-[var(--surface)]">
        <img
          src={post.enhancedImageUrl}
          alt="Enhanced post"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Action icons row */}
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

      {/* Caption & content */}
      <div className="px-4 pb-4 space-y-3">
        {/* Caption */}
        <div>
          <p className="text-sm leading-relaxed text-[var(--foreground)]">
            <span className="font-semibold mr-1.5">ai_marketing_agency</span>
            {truncatedCaption}
          </p>
          {post.caption.length > 120 && !captionExpanded && (
            <button
              onClick={() => setCaptionExpanded(true)}
              className="text-xs text-gray-500 hover:text-gray-400 mt-1 transition-colors"
            >
              Read more
            </button>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-2">
          <p className="text-xs font-semibold text-[var(--accent-light)]">
            {post.cta}
          </p>
        </div>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Best posting time */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Best time to post: <span className="text-[var(--foreground)] font-medium">{post.bestPostingTime}</span>
          </span>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium
            transition-all duration-200
            ${
              copied
                ? "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30"
                : "bg-[var(--surface-light)] text-gray-400 hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border)]"
            }
          `}
        >
          {copied ? (
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

        {/* Agent reasoning (collapsible) */}
        {post.reasoning && (
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <button
              onClick={() => setReasoningOpen(!reasoningOpen)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
            >
              <Sparkles className="h-3 w-3" />
              <span>Agent Reasoning</span>
              <svg
                className={`ml-auto h-3 w-3 transition-transform duration-200 ${reasoningOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {reasoningOpen && (
              <div className="mt-2 rounded-lg bg-[var(--surface)] p-3 text-xs text-gray-400 leading-relaxed animate-in slide-in-from-top-1">
                {post.reasoning}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
