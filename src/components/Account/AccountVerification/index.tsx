import { useUserService } from '@/domains';
import type { InitiateUISVerifyRequest, SendEmailVerifyRequest } from '@/domains/User';
import { USER_STATUS } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import {
  Alert,
  Button,
  ErrorMessage,
  Form,
  Input,
  InputGroup,
  Label,
  Modal,
  Tabs,
  TextField,
  toast,
} from '@heroui/react';
import { useRequest, useUnmount } from 'ahooks';
import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiMailLine,
  RiShieldUserLine,
} from 'react-icons/ri';
import VerifyBanner from '../VerifyBanner';
import type { AccountVerificationProps, UisOutcomeState, VerifyModalMode } from './index.type';
import { resolveUisQrImageDataUrl } from './resolveUisQrImageDataUrl';
import styles from './style.module.less';

type VerifyFormErrors = Partial<Record<'email' | 'uisAccount' | 'uisPassword', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AccountVerification({ user, onUserInfoUpdated }: AccountVerificationProps) {
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
      nextErrors.email = '请输入邮箱';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = '请输入有效邮箱地址';
    }

    setVerifyFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateUisForm = () => {
    const nextErrors: VerifyFormErrors = {};

    if (uisAccount.trim() === '') {
      nextErrors.uisAccount = '请输入 UIS 账号';
    }

    if (uisPassword === '') {
      nextErrors.uisPassword = '请输入 UIS 密码';
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
        toast.success('验证邮件已发送，请查收');
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
        const toastId = toast('正在确认 UIS 认证状态…', { isLoading: true, timeout: 0 });
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
        const data = await userService.getFullUserInfo();
        onUserInfoUpdated(data);
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

      <Modal isOpen={verifyModalOpen} onOpenChange={handleVerifyModalOpenChange}>
        <Modal.Backdrop isDismissable={!verifySubmitting}>
          <Modal.Container size="md" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>账号验证</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Tabs
                  className={styles.verifyModeTabs}
                  selectedKey={verifyMode}
                  onSelectionChange={(nextMode) => {
                    setVerifyMode(String(nextMode) as VerifyModalMode);
                    resetVerifyForm();
                  }}
                >
                  <Tabs.ListContainer className={styles.verifyModeTabsListContainer}>
                    <Tabs.List className={styles.verifyModeTabsList} aria-label="验证方式">
                      <Tabs.Tab className={styles.verifyModeTab} id="uis">
                        复旦 UIS 验证
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab className={styles.verifyModeTab} id="email">
                        邮箱验证
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
                          <RiInformationLine size={18} />
                        </Alert.Indicator>
                        <Alert.Content>
                          <Alert.Description>
                            请输入完整邮箱地址，系统将发送包含验证链接的邮件。
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
                        <Label>邮箱</Label>
                        <InputGroup>
                          <InputGroup.Prefix>
                            <RiMailLine size={18} className={styles.verifyInputIcon} />
                          </InputGroup.Prefix>
                          <InputGroup.Input type="email" placeholder="请输入完整邮箱地址" />
                        </InputGroup>
                        <ErrorMessage>{verifyFormErrors.email}</ErrorMessage>
                      </TextField>
                    </>
                  ) : (
                    <>
                      <Alert className={styles.verifyModeAlert} status="accent">
                        <Alert.Indicator>
                          <RiInformationLine size={18} />
                        </Alert.Indicator>
                        <Alert.Content>
                          <Alert.Description>
                            使用复旦大学统一身份认证（UIS）账号与密码发起认证，请按后续提示完成验证。
                          </Alert.Description>
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
                        <Label>UIS 账号</Label>
                        <InputGroup>
                          <InputGroup.Prefix>
                            <RiShieldUserLine size={18} className={styles.verifyInputIcon} />
                          </InputGroup.Prefix>
                          <InputGroup.Input
                            placeholder="学工号或 UIS 账号"
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
                        <Label>UIS 密码</Label>
                        <Input
                          type="password"
                          placeholder="UIS 密码"
                          autoComplete="current-password"
                        />
                        <ErrorMessage>{verifyFormErrors.uisPassword}</ErrorMessage>
                      </TextField>
                    </>
                  )}
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onPress={handleVerifyModalClose}
                  isDisabled={verifySubmitting}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  isDisabled={verifySubmitting}
                  type="submit"
                  form="account-verification-form"
                >
                  {verifyMode === 'email' ? '发送验证邮件' : '发起 UIS 认证'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal
        isOpen={uisOutcomeOpen && uisOutcome != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) handleUisOutcomeModalClose();
        }}
      >
        <Modal.Backdrop isDismissable={!uisAwaitingScan}>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {uisAwaitingScan ? '请扫码完成 UIS 验证' : 'UIS 认证'}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {uisOutcome != null && (
                  <div className={styles.uisOutcomeBody}>
                    {uisAwaitingScan ? (
                      <>
                        {uisOutcome.actionPayload.trim() === '' ? (
                          <Alert status="warning">
                            <Alert.Indicator>
                              <RiErrorWarningLine size={18} />
                            </Alert.Indicator>
                            <Alert.Content>
                              <Alert.Title>未返回二维码数据，请稍后重试或联系管理员</Alert.Title>
                            </Alert.Content>
                          </Alert>
                        ) : uisQrImageSrc != null ? (
                          <>
                            <Alert className={styles.uisOutcomeHint} status="accent">
                              <Alert.Indicator>
                                <RiInformationLine size={18} />
                              </Alert.Indicator>
                              <Alert.Content>
                                <Alert.Title>
                                  请使用复旦大学 UIS 相关应用或微信等扫码完成验证。
                                </Alert.Title>
                              </Alert.Content>
                            </Alert>
                            <div className={styles.uisQrWrap}>
                              <img
                                src={uisQrImageSrc}
                                alt="UIS 验证二维码"
                                className={styles.uisQrImg}
                              />
                            </div>
                          </>
                        ) : (
                          <Alert status="warning">
                            <Alert.Indicator>
                              <RiErrorWarningLine size={18} />
                            </Alert.Indicator>
                            <Alert.Content>
                              <Alert.Title>二维码图片数据无效</Alert.Title>
                              <Alert.Description>
                                服务端应返回 PNG 或 JPEG 的 base64 编码字符串；也可使用
                                data:image/png;base64, 前缀格式。
                              </Alert.Description>
                            </Alert.Content>
                          </Alert>
                        )}
                      </>
                    ) : (
                      <Alert status="success">
                        <Alert.Indicator>
                          <RiCheckboxCircleLine size={18} />
                        </Alert.Indicator>
                        <Alert.Content>
                          <Alert.Title>认证成功</Alert.Title>
                          {uisOutcome.message.trim() !== '' ? (
                            <Alert.Description>{uisOutcome.message}</Alert.Description>
                          ) : null}
                        </Alert.Content>
                      </Alert>
                    )}
                  </div>
                )}
              </Modal.Body>
              {!uisAwaitingScan ? (
                <Modal.Footer>
                  <Button variant="primary" onPress={handleUisOutcomeModalClose}>
                    知道了
                  </Button>
                </Modal.Footer>
              ) : null}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

export default AccountVerification;
