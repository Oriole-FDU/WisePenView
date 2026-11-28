import type { FormEvent } from 'react';

import type { VerifyFormErrors, VerifyModalMode } from '../index.type';

export interface AccountVerificationFormProps {
  formId?: string;
  verifyMode: VerifyModalMode;
  email: string;
  uisAccount: string;
  uisPassword: string;
  verifyFormErrors: VerifyFormErrors;
  onModeChange: (mode: VerifyModalMode) => void;
  onEmailChange: (email: string) => void;
  onUisAccountChange: (account: string) => void;
  onUisPasswordChange: (password: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
