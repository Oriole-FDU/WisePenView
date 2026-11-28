import type { NoteOutlineItem } from '@/components/editors/note/CustomBlockNote/index.type';

export interface NoteOutlineProps {
  items: NoteOutlineItem[];
  activeId?: string;
  onNavigate: (id: string) => void;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
