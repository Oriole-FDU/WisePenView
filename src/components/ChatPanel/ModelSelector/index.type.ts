import type { Model } from '@/components/ChatPanel/index.type';

export interface ModelSelectorProps {
  value: string;
  onChange: (model: Model) => void;
}
