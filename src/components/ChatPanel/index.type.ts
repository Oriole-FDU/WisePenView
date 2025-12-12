export interface ModelTag {
  text: string;
  type: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string; // 'openai' | 'anthropic' | ...
  tags: ModelTag[];
  multiplier: string | null;
  vision: boolean;
  usageRank: number;
  category: 'reasoning' | 'chat' | 'coding' | 'all-round';
}

export type MessageRole = 'user' | 'ai' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string; // 正文内容
  
  reasoningContent?: string; 
  
  createAt: number;
  loading?: boolean;
  error?: boolean;

  meta?: {
    provider?: string;
    modelId?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTime?: number; 
    };
  };
}