// Brand personas
export type Persona = "trendy_fnb" | "luxury_brand" | "casual_ecom" | "health_wellness" | "tech_startup";

export interface PersonaConfig {
  id: Persona;
  name: string;
  description: string;
  tone: string;
  emoji_style: string;
  hashtag_style: string;
  color: string; // for UI accent
}

// API request/response types
export interface EnhanceImageRequest {
  imageBase64: string;
  persona: Persona;
  prompt: string;
}

export interface EnhanceImageResponse {
  enhancedImageUrl: string;
  originalImageUrl: string;
}

export interface GenerateCopyRequest {
  prompt: string;
  persona: Persona;
  imageDescription?: string;
}

export interface GenerateCopyResponse {
  caption: string;
  hashtags: string[];
  cta: string;
  bestPostingTime: string;
  reasoning: string;
}

export interface CreatePostRequest {
  image: File | string; // File for upload, base64 string
  prompt: string;
  persona: Persona;
}

export interface CreatePostResponse {
  enhancedImageUrl: string;
  caption: string;
  hashtags: string[];
  cta: string;
  bestPostingTime: string;
  reasoning: string;
}

// Agent activity for UI display
export interface AgentActivity {
  agent: string;
  message: string;
  timestamp: number;
  status: "thinking" | "working" | "done" | "error";
}
