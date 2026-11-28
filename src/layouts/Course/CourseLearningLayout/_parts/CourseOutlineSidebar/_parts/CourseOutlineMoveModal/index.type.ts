import type { CourseOutlineNode } from '@/domains/Course';

export interface CourseOutlineMoveModalProps {
  isOpen: boolean;
  title: string;
  hint: string;
  nodes: CourseOutlineNode[];
  currentParentId?: string;
  isSubmitting: boolean;
  confirmText: string;
  cancelText: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetNodeId: string) => void;
}
