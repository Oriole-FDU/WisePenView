import type { ChatModel } from '@/domains/ChatConfig';

export type ModelSelectorTriggerVariant = 'default' | 'icon';

export interface ModelSelectorProps {
  models: ChatModel[];
  selectedId?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (model: ChatModel) => void;
  loading?: boolean;
  disabled?: boolean;
  placement?: 'top' | 'bottom';
  /** default：图标+名称；icon：仅图标（窄侧栏） */
  triggerVariant?: ModelSelectorTriggerVariant;
}
