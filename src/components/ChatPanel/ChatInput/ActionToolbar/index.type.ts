import type { Model } from '@/components/ChatPanel/index.type';

export interface ActionToolbarProps {
  modelValue: string;
  onModelChange: (model: Model) => void;
  onSend: () => void;
  disabledSend: boolean;
  capabilityCount: number;
  capabilityOpen: boolean;
  onCapabilityOpenChange: (open: boolean) => void;
  capabilityDropdownContent: React.ReactNode;
  contentPickOpen: boolean;
  onContentPickOpenChange: (open: boolean) => void;
  contentPickDropdownContent: React.ReactNode;
}
