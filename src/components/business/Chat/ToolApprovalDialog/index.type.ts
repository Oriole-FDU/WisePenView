export interface ToolApprovalDialogProps {
  name: string;
  input: unknown;
  submitting: boolean;
  onDecision: (approved: boolean) => void;
}
