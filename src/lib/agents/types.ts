export type AgentRole =
  | "marketing_head"
  | "content_creator"
  | "critic_brand"
  | "critic_engagement"
  | "review_council";

export interface AgentMessage {
  id: string;
  agent: AgentRole;
  agentName: string;
  content: string;
  timestamp: number;
  type: "strategy" | "draft" | "critique" | "revision" | "approval" | "system";
  metadata?: {
    score?: number; // 1-10 rating
    variant?: number; // which caption variant
    approved?: boolean;
    revisionRequested?: boolean;
  };
}

export interface DebateState {
  messages: AgentMessage[];
  status:
    | "idle"
    | "strategizing"
    | "drafting"
    | "critiquing"
    | "revising"
    | "approving"
    | "complete";
  captionVariants: string[];
  finalCaption: string | null;
  finalHashtags: string[];
  finalCta: string | null;
  bestPostingTime: string | null;
}

export interface AgentConfig {
  role: AgentRole;
  name: string;
  avatar: string; // emoji
  color: string; // hex color for UI
  systemPrompt: string;
}
