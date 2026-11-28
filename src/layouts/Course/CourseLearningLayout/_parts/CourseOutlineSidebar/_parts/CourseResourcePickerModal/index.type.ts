export interface CourseResourcePickerModalProps {
  isOpen: boolean;
  courseId: string;
  targetNodeId: string;
  targetName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
