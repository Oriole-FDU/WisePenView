import type { NoteFindResult } from '../../index.type';

export interface FindBarProps {
  query: string;
  replacement: string;
  result: NoteFindResult | null;
  replaced: number;
  canReplace: boolean;
  onQueryChange: (query: string) => void;
  onReplacementChange: (replacement: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}
