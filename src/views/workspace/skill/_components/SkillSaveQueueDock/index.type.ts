export type SkillSaveQueuePhase = 'pending' | 'preparing' | 'uploading' | 'done' | 'failed';

export interface SkillSaveQueueItem {
  id: string;
  kind: 'file' | 'config';
  name: string;
  path: string;
  phase: SkillSaveQueuePhase;
  progress: number;
  revision: number;
  size?: number;
  errorMessage?: string;
}

export interface SkillSaveQueueDockProps {
  items: SkillSaveQueueItem[];
  onRetry?: () => void;
}
