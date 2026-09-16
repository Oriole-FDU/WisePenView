import { toast } from '@heroui/react';
import { useUnmount } from 'ahooks';
import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DEFAULT_AUTH_REDIRECT_PATH,
  getCurrentRedirectPath,
  getCurrentRouteSearch,
  readRedirectParam,
  saveAuthContinuation,
} from '@/bootstrap/authContinuation';
import { useUserService } from '@/domains';
import type { InitiateUISVerifyRequest, SendEmailVerifyRequest } from '@/domains/User';
import { useApi } from '@/hooks/useApi';

import type { UisOutcomeState, VerifyFormErrors, VerifyModalMode } from './index.type';
import { resolveUisQrImageDataUrl } from './resolveUisQrImageDataUrl';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resolveVerificationRedirectPath = (): string => {
  const authRedirectPath = readRedirectParam(getCurrentRouteSearch());
  return authRedirectPath === DEFAULT_AUTH_REDIRECT_PATH
    ? getCurrentRedirectPath()
    : authRedirectPath;
};

export interface UseAccountVerificationControllerOptions {
  defaultMode?: VerifyModalMode;
  onUserInfoReload: () => Promise<unknown>;
  onSubmitted?: () => void;
  onVerified?: () => void;
}

export const useAccountVerificationController = ({
  defaultMode = 'uis',
  onUserInfoReload,
  onSubmitted,
  onVerified,
}: UseAccountVerificationControllerOptions) => {
  const { t } = useTranslation(['profile']);
  const userService = useUserService();
  const [verifyMode, setVerifyMode] = useState<VerifyModalMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [uisAccount, setUisAccount] = useState('');
  const [uisPassword, setUisPassword] = useState('');
  const [verifyFormErrors, setVerifyFormErrors] = useState<VerifyFormErrors>({});
  const [uisOutcomeOpen, setUisOutcomeOpen] = useState(false);
  const [uisOutcome, setUisOutcome] = useState<UisOutcomeState | null>(null);
  const uisPollingActiveRef = useRef(false);
  const uisPollLoadingRef = useRef<(() => void) | null>(null);

  const resetVerifyForm = () => {
    setEmail('');
    setUisAccount('');
    setUisPassword('');
    setVerifyFormErrors({});
  };

  const validateEmailForm = () => {
    const nextErrors: VerifyFormErrors = {};
    const trimmedEmail = email.trim();

    if (trimmedEmail === '') {
      nextErrors.email = t('verification.emailRequired');
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = t('verification.emailInvalid');
    }

    setVerifyFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateUisForm = () => {
    const nextErrors: VerifyFormErrors = {};

    if (uisAccount.trim() === '') {
      nextErrors.uisAccount = t('verification.uisAccountRequired');
    }

    if (uisPassword === '') {
      nextErrors.uisPassword = t('verification.uisPasswordRequired');
    }

    setVerifyFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const { run: runUisPolling, cancel: cancelUisPolling } = useApi(
    () => userService.checkFudanUISVerify(),
    {
      manual: true,
      pollingInterval: 2000,
      onSuccess: (status) => {
        if (!uisPollingActiveRef.current) return;
        if (status.requireAction && status.actionPayload.trim() !== '') {
          uisPollLoadingRef.current?.();
          uisPollLoadingRef.current = null;
          setUisOutcome({
            pollingCompleted: false,
            requireAction: true,
            actionPayload: status.actionPayload,
            message: status.message,
          });
          setUisOutcomeOpen(true);
        }
        if (status.completed) {
          endUisPolling();
          setUisOutcome({
            pollingCompleted: true,
            requireAction: status.requireAction,
            actionPayload: status.actionPayload,
            message: status.message,
          });
          setUisOutcomeOpen(true);
        }
      },
      onErrorEffect: () => {
        if (!uisPollingActiveRef.current) return;
        dismissUisOutcome();
      },
    }
  );

  const dismissUisOutcome = () => {
    endUisPolling();
    setUisOutcomeOpen(false);
    setUisOutcome(null);
  };

  const endUisPolling = () => {
    uisPollingActiveRef.current = false;
    cancelUisPolling();
    uisPollLoadingRef.current?.();
    uisPollLoadingRef.current = null;
  };

  const { loading: emailSubmitting, run: runEmailVerifySubmit } = useApi(
    async () => {
      const params: SendEmailVerifyRequest = { email: email.trim() };
      saveAuthContinuation('verifyEmail', resolveVerificationRedirectPath());
      await userService.sendEmailVerify(params);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('verification.emailSent'));
        resetVerifyForm();
        setVerifyMode(defaultMode);
        onSubmitted?.();
      },
    }
  );

  const { loading: uisSubmitting, run: runUisVerifySubmit } = useApi(
    async () => {
      const params: InitiateUISVerifyRequest = {
        uisAccount: uisAccount.trim(),
        uisPassword,
      };
      saveAuthContinuation('uisVerify', resolveVerificationRedirectPath());
      await userService.initiateUISVerify(params);
    },
    {
      manual: true,
      onSuccess: () => {
        resetVerifyForm();
        setVerifyMode(defaultMode);
        onSubmitted?.();
        endUisPolling();
        uisPollingActiveRef.current = true;
        const toastId = toast(t('verification.checkingUis'), {
          isLoading: true,
          timeout: 0,
        });
        uisPollLoadingRef.current = () => toast.close(toastId);
        runUisPolling();
      },
    }
  );

  const handleVerifySubmit = () => {
    if (verifyMode === 'email') {
      if (!validateEmailForm()) return;
      runEmailVerifySubmit();
      return;
    }

    if (!validateUisForm()) return;
    runUisVerifySubmit();
  };

  const handleVerifyFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleVerifySubmit();
  };

  const handleVerifyModeChange = (nextMode: VerifyModalMode) => {
    setVerifyMode(nextMode);
    resetVerifyForm();
  };

  const handleEmailChange = (nextEmail: string) => {
    setEmail(nextEmail);
    setVerifyFormErrors((errors) => ({ ...errors, email: undefined }));
  };

  const handleUisAccountChange = (nextAccount: string) => {
    setUisAccount(nextAccount);
    setVerifyFormErrors((errors) => ({ ...errors, uisAccount: undefined }));
  };

  const handleUisPasswordChange = (nextPassword: string) => {
    setUisPassword(nextPassword);
    setVerifyFormErrors((errors) => ({ ...errors, uisPassword: undefined }));
  };

  const uisAwaitingScan = uisOutcome != null && !uisOutcome.pollingCompleted;

  const handleUisOutcomeModalClose = () => {
    if (uisAwaitingScan) return;

    dismissUisOutcome();
    void (async () => {
      try {
        await onUserInfoReload();
        if (uisOutcome?.pollingCompleted) {
          onVerified?.();
        }
      } catch {
        /* 刷新用户信息失败时静默，避免打断用户关闭弹窗 */
      }
    })();
  };

  useUnmount(() => {
    endUisPolling();
  });

  return {
    verifyMode,
    email,
    uisAccount,
    uisPassword,
    verifyFormErrors,
    verifySubmitting: emailSubmitting || uisSubmitting,
    uisOutcome,
    uisOutcomeOpen,
    uisAwaitingScan,
    uisQrImageSrc: resolveUisQrImageDataUrl(uisOutcome?.actionPayload ?? ''),
    resetVerifyForm,
    endUisPolling,
    handleVerifySubmit,
    handleVerifyFormSubmit,
    handleVerifyModeChange,
    handleEmailChange,
    handleUisAccountChange,
    handleUisPasswordChange,
    handleUisOutcomeModalClose,
  };
};
