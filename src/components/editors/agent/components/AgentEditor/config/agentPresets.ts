import type { AgentMemoryPolicy } from '@/domains/Agent';

export const RECOMMENDED_AGENT_MEMORY_SETTINGS = {
  highWatermarkRatio: 0.8,
  lowWatermarkRatio: 0.5,
  summaryPrompt: '',
  longTermMemoryLimit: 10,
  longTermMemoryScoreThreshold: 0.6,
} satisfies Pick<
  AgentMemoryPolicy,
  | 'highWatermarkRatio'
  | 'lowWatermarkRatio'
  | 'summaryPrompt'
  | 'longTermMemoryLimit'
  | 'longTermMemoryScoreThreshold'
>;
