import type { AgentAsset } from '@/domains/Agent';

export interface Props {
  assets: AgentAsset[];
  disabled: boolean;
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (id: string) => void;
}
