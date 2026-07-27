import { Input, InputGroup } from '@/components/Input';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import AppModal from '@/components/Overlay/AppModal';
import { useUserService } from '@/domains';
import type { InitiateUISVerifyRequest, SendEmailVerifyRequest } from '@/domains/User';
import { USER_STATUS } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { Alert, Button, ErrorMessage, Form, Label, Tabs, TextField, toast } from '@heroui/react';
import { useRequest, useUnmount } from 'ahooks';
import { CircleCheck, Info, Mail, ShieldUser, TriangleAlert } from 'lucide-react';
import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import VerifyBanner from '../VerifyBanner';
import type { AccountVerificationProps, UisOutcomeState, VerifyModalMode } from './index.type';
import { resolveUisQrImageDataUrl } from './resolveUisQrImageDataUrl';
import styles from './style.module.less';

type VerifyFormErrors = Partial<Record<'email' | 'uisAccount' | 'uisPassword', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AccountVerification({ user, onUserInfoReload }: AccountVerificationProps) {
  const { t } = useTranslation(['profile', 'common']);
  const userService = useUserService();
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyMode, setVerifyMode] = useState<VerifyModalMode>('uis');
  const [email, setEmail] = useState('');
  const [uisAccount, setUisAccount] = useState('');
  const [uisPassword, setUisPassword] = useState('');
  const [verifyFormErrors, setVerifyFormErrors] = useState<VerifyFormErrors>({});
  const [uisOutcomeOpen, setUisOutcomeOpen] = useState(false);
  const [uisOutcome, setUisOutcome] = useState<UisOutcomeState | null>(null);
  const uisPollingActiveRef = useRef(false);
  const uisPollLoadingRef = useRef<(() => void) | null>(null);

  const endUisPolling = () => {
    uisPollingActiveRef.current = false;
    cancelUisPolling();
    uisPollLoadingRef.current?.();
    uisPollLoadingRef.current = null;
  };

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
      nextErrors.email = t('profile:verification.emailRequired');
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = t('profile:verification.emailInvalid');
    }

    setVerifyFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateUisForm = () => {
    const nextErrors: VerifyFormErrors = {};

    if (uisAccount.trim() === '') {
      nextErrors.uisAccount = t('profile:verification.uisAccountRequired');
    }

    if (uisPassword === '') {
      nextErrors.uisPassword = t('profile:verification.uisPasswordRequired');
    }

    setVerifyFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const { run: runUisPolling, cancel: cancelUisPolling } = useRequest(
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
      onError: (pollErr) => {
        if (!uisPollingActiveRef.current) return;
        endUisPolling();
        toast.danger(parseErrorMessage(pollErr));
      },
    }
  );

  const { loading: emailSubmitting, run: runEmailVerifySubmit } = useRequest(
    async () => {
      const params: SendEmailVerifyRequest = { email: email.trim() };
      await userService.sendEmailVerify(params);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('profile:verification.emailSent'));
        resetVerifyForm();
        setVerifyMode('uis');
        setVerifyModalOpen(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: uisSubmitting, run: runUisVerifySubmit } = useRequest(
    async () => {
      const params: InitiateUISVerifyRequest = {
        uisAccount: uisAccount.trim(),
        uisPassword,
      };
      await userService.initiateUISVerify(params);
    },
    {
      manual: true,
      onSuccess: () => {
        resetVerifyForm();
        setVerifyMode('uis');
        setVerifyModalOpen(false);
        endUisPolling();
        uisPollingActiveRef.current = true;
        const toastId = toast(t('profile:verification.checkingUis'), {
          isLoading: true,
          timeout: 0,
        });
        uisPollLoadingRef.current = () => toast.close(toastId);
        runUisPolling();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const verifySubmitting = emailSubmitting || uisSubmitting;

  useUnmount(() => {
    endUisPolling();
  });

  const handleVerify = () => {
    endUisPolling();
    resetVerifyForm();
    setVerifyMode('uis');
    setVerifyModalOpen(true);
  };

  const handleVerifyModalClose = () => {
    resetVerifyForm();
    setVerifyMode('uis');
    setVerifyModalOpen(false);
  };

  const handleVerifyModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleVerifyModalClose();
      return;
    }

    setVerifyModalOpen(true);
  };

  const handleUisOutcomeModalClose = () => {
    if (uisAwaitingScan) return;

    endUisPolling();
    setUisOutcomeOpen(false);
    setUisOutcome(null);
    void (async () => {
      try {
        await onUserInfoReload();
      } catch {
        /* 刷新用户信息失败时静默，避免打断用户关闭弹窗 */
      }
    })();
  };

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

  const uisQrImageSrc = resolveUisQrImageDataUrl(uisOutcome?.actionPayload ?? '');
  const uisAwaitingScan = uisOutcome != null && !uisOutcome.pollingCompleted;
  const showBanner = user?.userInfo?.status === USER_STATUS.UNVERIFIED;

  return (
    <>
      <VerifyBanner visible={showBanner} onGoVerify={handleVerify} />

      <AppModal
        isOpen={verifyModalOpen}
        onOpenChange={handleVerifyModalOpenChange}
        title={t('profile:verification.title')}
        size="md"
        isDismissable={!verifySubmitting}
        actions={
          <>
            <Button
              variant="secondary"
              isDisabled={verifySubmitting}
              onPress={handleVerifyModalClose}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="primary"
              isDisabled={verifySubmitting}
              aria-busy={verifySubmitting || undefined}
              onPress={handleVerifySubmit}
            >
              {verifyMode === 'email'
                ? t('profile:verification.sendEmail')
                : t('profile:verification.startUis')}
            </Button>
          </>
        }
      >
        <Tabs
          className={styles.verifyModeTabs}
          selectedKey={verifyMode}
          onSelectionChange={(nextMode) => {
            setVerifyMode(String(nextMode) as VerifyModalMode);
            resetVerifyForm();
          }}
        >
          <Tabs.ListContainer className={styles.verifyModeTabsListContainer}>
            <Tabs.List
              className={styles.verifyModeTabsList}
              aria-label={t('profile:verification.methodAria')}
            >
              <Tabs.Tab className={styles.verifyModeTab} id="uis">
                {t('profile:verification.uisTab')}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab className={styles.verifyModeTab} id="email">
                {t('profile:verification.emailTab')}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
        <Form
          id="account-verification-form"
          onSubmit={handleVerifyFormSubmit}
          className={styles.verifyForm}
        >
          {verifyMode === 'email' ? (
            <>
              <Alert className={styles.verifyModeAlert} status="accent">
                <Alert.Indicator>
                  <Info size={18} />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description>
                    {t('profile:verification.emailDescription')}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
              <TextField
                value={email}
                onChange={(nextEmail) => {
                  setEmail(nextEmail);
                  setVerifyFormErrors((errors) => ({ ...errors, email: undefined }));
                }}
                isInvalid={verifyFormErrors.email != null}
                name="email"
              >
                <Label>{t('profile:verification.emailLabel')}</Label>
                <InputGroup>
                  <InputGroup.Prefix>
                    <Mail size={18} className={styles.verifyInputIcon} />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    type="email"
                    placeholder={t('profile:verification.emailPlaceholder')}
                  />
                </InputGroup>
                <ErrorMessage>{verifyFormErrors.email}</ErrorMessage>
              </TextField>
            </>
          ) : (
            <>
              <Alert className={styles.verifyModeAlert} status="accent">
                <Alert.Indicator>
                  <Info size={18} />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description>{t('profile:verification.uisDescription')}</Alert.Description>
                </Alert.Content>
              </Alert>
              <TextField
                value={uisAccount}
                onChange={(nextAccount) => {
                  setUisAccount(nextAccount);
                  setVerifyFormErrors((errors) => ({ ...errors, uisAccount: undefined }));
                }}
                isInvalid={verifyFormErrors.uisAccount != null}
                name="uisAccount"
              >
                <Label>{t('profile:verification.uisAccountLabel')}</Label>
                <InputGroup>
                  <InputGroup.Prefix>
                    <ShieldUser size={18} className={styles.verifyInputIcon} />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    placeholder={t('profile:verification.uisAccountPlaceholder')}
                    autoComplete="username"
                  />
                </InputGroup>
                <ErrorMessage>{verifyFormErrors.uisAccount}</ErrorMessage>
              </TextField>
              <TextField
                value={uisPassword}
                onChange={(nextPassword) => {
                  setUisPassword(nextPassword);
                  setVerifyFormErrors((errors) => ({
                    ...errors,
                    uisPassword: undefined,
                  }));
                }}
                isInvalid={verifyFormErrors.uisPassword != null}
                name="uisPassword"
              >
                <Label>{t('profile:verification.uisPasswordLabel')}</Label>
                <Input
                  type="password"
                  placeholder={t('profile:verification.uisPasswordLabel')}
                  autoComplete="current-password"
                />
                <ErrorMessage>{verifyFormErrors.uisPassword}</ErrorMessage>
              </TextField>
            </>
          )}
        </Form>
      </AppModal>

      <AppDisplayDialog
        isOpen={uisOutcomeOpen && uisOutcome != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) handleUisOutcomeModalClose();
        }}
        title={
          uisAwaitingScan ? t('profile:verification.scanTitle') : t('profile:verification.uisTitle')
        }
        isDismissable={!uisAwaitingScan}
        footer={uisAwaitingScan ? null : undefined}
        closeText={t('profile:verification.acknowledge')}
      >
        {uisOutcome != null && (
          <div className={styles.uisOutcomeBody}>
            {uisAwaitingScan ? (
              <>
                {uisOutcome.actionPayload.trim() === '' ? (
                  <Alert status="warning">
                    <Alert.Indicator>
                      <TriangleAlert size={18} />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title>{t('profile:verification.qrMissing')}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                ) : uisQrImageSrc != null ? (
                  <>
                    <Alert className={styles.uisOutcomeHint} status="accent">
                      <Alert.Indicator>
                        <Info size={18} />
                      </Alert.Indicator>
                      <Alert.Content>
                        <Alert.Title>{t('profile:verification.scanHint')}</Alert.Title>
                      </Alert.Content>
                    </Alert>
                    <div className={styles.uisQrWrap}>
                      <img
                        src={uisQrImageSrc}
                        alt={t('profile:verification.qrAlt')}
                        className={styles.uisQrImg}
                      />
                    </div>
                  </>
                ) : (
                  <Alert status="warning">
                    <Alert.Indicator>
                      <TriangleAlert size={18} />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title>{t('profile:verification.qrInvalid')}</Alert.Title>
                      <Alert.Description>
                        {t('profile:verification.qrInvalidDescription')}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
              </>
            ) : (
              <Alert status="success">
                <Alert.Indicator>
                  <CircleCheck size={18} />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Title>{t('profile:verification.success')}</Alert.Title>
                  {uisOutcome.message.trim() !== '' ? (
                    <Alert.Description>{uisOutcome.message}</Alert.Description>
                  ) : null}
                </Alert.Content>
              </Alert>
            )}
          </div>
        )}
      </AppDisplayDialog>
    </>
  );
}

export default AccountVerification;
