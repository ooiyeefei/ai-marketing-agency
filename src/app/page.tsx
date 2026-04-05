"use client";

import { useState, useCallback, useRef } from "react";
import { Sparkles } from "lucide-react";
import type { Persona } from "@/lib/types";
import type { AgentMessage, DebateState } from "@/lib/agents/types";
import PersonaSelector from "@/components/persona-selector";
import UploadForm from "@/components/upload-form";
import DebatePanel from "@/components/debate-panel";
import DebateResult from "@/components/debate-result";

const INITIAL_STATE: DebateState = {
  messages: [],
  status: "idle",
  captionVariants: [],
  finalCaption: null,
  finalHashtags: [],
  finalCta: null,
  bestPostingTime: null,
};

export default function HomePage() {
  const [selectedPersona, setSelectedPersona] = useState<Persona>("trendy_fnb");
  const [debate, setDebate] = useState<DebateState>(INITIAL_STATE);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [styledImageUrl, setStyledImageUrl] = useState<string | null>(null);
  const [variations, setVariations] = useState<Array<{ provider: string; label: string; dataUri: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setDebate({ ...INITIAL_STATE, status: "strategizing" });
      setOriginalImageUrl(null);
      setStyledImageUrl(null);
      setVariations([]);

      formData.append("persona", selectedPersona);

      try {
        const res = await fetch("/api/debate", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const dataLine = line.trim();
            if (!dataLine.startsWith("data: ")) continue;

            try {
              const event = JSON.parse(dataLine.slice(6));

              switch (event.type) {
                case "message": {
                  const msg = event.payload as AgentMessage;
                  setDebate((prev) => {
                    // Derive status from message type
                    const statusMap: Record<string, DebateState["status"]> = {
                      strategy: "strategizing",
                      draft: "drafting",
                      critique: "critiquing",
                      revision: "revising",
                      approval: "approving",
                    };
                    return {
                      ...prev,
                      messages: [...prev.messages, msg],
                      status: statusMap[msg.type] || prev.status,
                    };
                  });
                  break;
                }
                case "image": {
                  if (event.payload.originalImageUrl) setOriginalImageUrl(event.payload.originalImageUrl);
                  if (event.payload.enhancedImageUrl) setStyledImageUrl(event.payload.enhancedImageUrl);
                  if (event.payload.variations?.length) setVariations(event.payload.variations);
                  break;
                }
                case "complete": {
                  const p = event.payload;
                  setDebate((prev) => ({
                    ...prev,
                    status: "complete",
                    finalCaption: p.caption || prev.finalCaption,
                    finalHashtags: p.hashtags?.length ? p.hashtags : prev.finalHashtags,
                    finalCta: p.cta || prev.finalCta,
                    bestPostingTime: p.bestPostingTime || prev.bestPostingTime,
                  }));
                  if (p.originalImageUrl) setOriginalImageUrl(p.originalImageUrl);
                  if (p.enhancedImageUrl) setStyledImageUrl(p.enhancedImageUrl);
                  if (p.variations?.length) setVariations(p.variations);
                  break;
                }
                case "error": {
                  console.error("Debate error:", event.payload.message);
                  setDebate((prev) => ({
                    ...prev,
                    status: "idle",
                    messages: [
                      ...prev.messages,
                      {
                        id: `error_${Date.now()}`,
                        agent: "review_council",
                        agentName: "System",
                        content: `Error: ${event.payload.message}`,
                        timestamp: Date.now(),
                        type: "system",
                      },
                    ],
                  }));
                  break;
                }
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Debate stream failed:", err);
        setDebate((prev) => ({
          ...prev,
          status: "idle",
          messages: [
            ...prev.messages,
            {
              id: `error_${Date.now()}`,
              agent: "review_council",
              agentName: "System",
              content: `Connection error: ${(err as Error).message}`,
              timestamp: Date.now(),
              type: "system",
            },
          ],
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [selectedPersona]
  );

  const hasResult = debate.status === "complete" && debate.finalCaption;

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative text-center py-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-64 w-[600px] rounded-full bg-[var(--accent)]/5 blur-[100px]" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/50 px-4 py-1.5 mb-5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent-light)]" />
            <span className="text-xs text-gray-400">
              Powered by AI Agents
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            <span className="gradient-text">Your AI Marketing Team</span>
          </h1>

          <p className="text-gray-400 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            Upload a product photo &rarr; Watch agents debate &rarr; Get a
            polished Instagram post in 30 seconds
          </p>

          <div className="flex items-center justify-center gap-3 mt-6">
            {["var(--accent)", "#ec4899", "#f59e0b"].map((color, i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full agent-pulse"
                style={{
                  backgroundColor: color,
                  animationDelay: `${i * 300}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Left Column: Form (2/5 width) */}
        <div className="space-y-6 lg:col-span-2">
          <PersonaSelector
            selected={selectedPersona}
            onSelect={setSelectedPersona}
          />
          <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {/* Right Column: Debate + Result (3/5 width) */}
        <div className="space-y-6 lg:col-span-3">
          <DebatePanel
            messages={debate.messages}
            status={debate.status}
          />

          {hasResult && (
            <DebateResult
              caption={debate.finalCaption}
              hashtags={debate.finalHashtags}
              cta={debate.finalCta}
              bestPostingTime={debate.bestPostingTime}
              enhancedImageUrl={styledImageUrl || originalImageUrl}
              styledImageUrl={originalImageUrl}
              variations={variations}
              debateMessages={debate.messages}
            />
          )}
        </div>
      </div>
    </div>
  );
}
