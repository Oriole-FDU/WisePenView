import type { VerifyModalMode } from '@/components/business/AccountVerification/index.type';
import type { UserAccountProfile } from '@/domains/User';

export interface AccountVerificationProps {
  user: UserAccountProfile | null;
  onUserInfoReload: () => Promise<unknown>;
  defaultOpen?: boolean;
  defaultMode?: VerifyModalMode;
  showVerifyBanner?: boolean;
  onVerified?: () => void;
}
