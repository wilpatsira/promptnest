export type Platform = 'ChatGPT' | 'Claude' | 'Copilot' | 'Grok' | 'Gemini' | 'Perplexity';

export interface User {
  id: string; // UUID from Supabase
  username: string; // Now acts as a display ID or legacy field
  licenseCode: string;
  displayName: string;
  email: string;
  photoUrl: string; // URL or base64
  joinedAt: number;
  redeemedAt?: number; // Waktu pertama kali lisensi dimasukkan
}

export interface PromptVersion {
  timestamp: number;
  title: string;
  description: string;
  content: string;
  tags: string[];
  platform: Platform;
}

export interface Prompt {
  id: string;
  userId: string; // Owner of the prompt (user UUID)
  title: string;
  description: string;
  content: string;
  tags: string[];
  platform: Platform;
  createdAt: number;
  updatedAt: number;
  history?: PromptVersion[];
  isFavorite: boolean;
}

export interface PromptFormData {
  title: string;
  description: string;
  content: string;
  tags: string[]; // Managed as array for chip input
  platform: Platform;
}

export const PLATFORMS: Platform[] = ['ChatGPT', 'Claude', 'Copilot', 'Grok', 'Gemini', 'Perplexity'];

// Helper to generate execution URLs
export const getPlatformUrl = (platform: Platform, content: string): string => {
  const encoded = encodeURIComponent(content);
  switch (platform) {
    case 'ChatGPT':
      return `https://chatgpt.com/?q=${encoded}`;
    case 'Perplexity':
      return `https://www.perplexity.ai/search?q=${encoded}`;
    case 'Claude':
      return `https://claude.ai/new?q=${encoded}`;
    case 'Grok':
      return `https://grok.com/?q=${encoded}`;
    case 'Copilot':
      return 'https://copilot.microsoft.com/';
    case 'Gemini':
      return 'https://gemini.google.com/app';
    default:
      return `https://chatgpt.com/?q=${encoded}`;
  }
};