import type { UisOutcomeState } from '../index.type';

export interface AccountVerificationOutcomeDialogProps {
  isOpen: boolean;
  uisOutcome: UisOutcomeState | null;
  uisAwaitingScan: boolean;
  uisQrImageSrc: string | null;
  onClose: () => void;
}
