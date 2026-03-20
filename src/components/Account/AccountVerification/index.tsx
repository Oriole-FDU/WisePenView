import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, message, Modal, Radio } from 'antd';
import { RiMailLine, RiShieldUserLine } from 'react-icons/ri';
import { useUserService } from '@/contexts/ServicesContext';
import type { InitiateUISVerifyRequest, SendEmailVerifyRequest } from '@/services/User';
import { USER_STATUS } from '@/constants/user';
import { usePendingVerifyEmailStore } from '@/store';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import VerifyBanner from '../VerifyBanner';
import { resolveUisQrImageDataUrl } from './resolveUisQrImageDataUrl';
import type {
  AccountVerificationProps,
  UisOutcomeState,
  VerifyModalFormValues,
  VerifyModalMode,
} from './index.type';
import styles from './style.module.less';

const AccountVerification: React.FC<AccountVerificationProps> = ({ user, onUserInfoUpdated }) => {
  const userService = useUserService();
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyMode, setVerifyMode] = useState<VerifyModalMode>('uis');
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [uisOutcomeOpen, setUisOutcomeOpen] = useState(false);
  const [uisOutcome, setUisOutcome] = useState<UisOutcomeState | null>(null);
  const uisPollAbortRef = useRef<AbortController | null>(null);
  const [verifyForm] = Form.useForm<VerifyModalFormValues>();
  const setPendingVerifyEmail = usePendingVerifyEmailStore((s) => s.setEmail);

  useEffect(
    () => () => {
      uisPollAbortRef.current?.abort();
    },
    []
  );

  const handleVerify = () => {
    uisPollAbortRef.current?.abort();
    uisPollAbortRef.current = null;
    verifyForm.resetFields();
    setVerifyMode('uis');
    setVerifySubmitting(false);
    setVerifyModalOpen(true);
  };

  const handleVerifyModalCancel = () => {
    verifyForm.resetFields();
    setVerifyMode('uis');
    setVerifySubmitting(false);
    setVerifyModalOpen(false);
  };

  const handleUisOutcomeModalClose = () => {
    uisPollAbortRef.current?.abort();
    uisPollAbortRef.current = null;
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

  const handleVerifySubmit = async () => {
    try {
      setVerifySubmitting(true);
      if (verifyMode === 'email') {
        const values = await verifyForm.validateFields(['email']);
        const email = (values.email ?? '').trim();
        const params: SendEmailVerifyRequest = { email };
        await userService.sendEmailVerify(params);
        setPendingVerifyEmail(email);
        message.success('验证邮件已发送，请查收');
      } else {
        const values = await verifyForm.validateFields(['uisAccount', 'uisPassword']);
        const params: InitiateUISVerifyRequest = {
          uisAccount: (values.uisAccount ?? '').trim(),
          uisPassword: values.uisPassword ?? '',
        };
        await userService.initiateUISVerify(params);
        verifyForm.resetFields();
        setVerifyMode('uis');
        setVerifyModalOpen(false);
        setVerifySubmitting(false);

        uisPollAbortRef.current?.abort();
        const controller = new AbortController();
        uisPollAbortRef.current = controller;
        let destroyPollLoading: (() => void) | null = message.loading('正在确认 UIS 认证状态…', 0);
        const endPollLoading = () => {
          destroyPollLoading?.();
          destroyPollLoading = null;
        };
        try {
          const result = await userService.pollFudanUISVerifyUntilComplete({
            signal: controller.signal,
            onProgress: (status) => {
              if (status.requireAction && status.actionPayload.trim() !== '') {
                endPollLoading();
                setUisOutcome({
                  pollingCompleted: false,
                  requireAction: true,
                  actionPayload: status.actionPayload,
                  message: status.message,
                });
                setUisOutcomeOpen(true);
              }
            },
          });
          endPollLoading();
          setUisOutcome({
            pollingCompleted: true,
            requireAction: result.requireAction,
            actionPayload: result.actionPayload,
            message: result.message,
          });
          setUisOutcomeOpen(true);
        } catch (pollErr) {
          endPollLoading();
          if (pollErr instanceof DOMException && pollErr.name === 'AbortError') {
            return;
          }
          message.error(parseErrorMessage(pollErr, '确认认证状态失败'));
        }
        return;
      }
      verifyForm.resetFields();
      setVerifyMode('uis');
      setVerifyModalOpen(false);
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(parseErrorMessage(err, '提交失败'));
    } finally {
      setVerifySubmitting(false);
    }
  };

  const uisQrImageSrc = resolveUisQrImageDataUrl(uisOutcome?.actionPayload ?? '');
  const uisAwaitingScan = uisOutcome != null && !uisOutcome.pollingCompleted;
  const showBanner = user?.userInfo?.status === USER_STATUS.UNVERIFIED;

  return (
    <>
      <VerifyBanner visible={showBanner} onGoVerify={handleVerify} />

      <Modal
        title="账号验证"
        open={verifyModalOpen}
        onCancel={handleVerifyModalCancel}
        destroyOnHidden
        footer={[
          <Button key="cancel" onClick={handleVerifyModalCancel} disabled={verifySubmitting}>
            取消
          </Button>,
          <Button
            key="verify"
            type="primary"
            loading={verifySubmitting}
            onClick={handleVerifySubmit}
          >
            {verifyMode === 'email' ? '发送验证邮件' : '发起 UIS 认证'}
          </Button>,
        ]}
        width={480}
      >
        <Radio.Group
          className={styles.verifyModeRadio}
          value={verifyMode}
          onChange={(e) => {
            setVerifyMode(e.target.value as VerifyModalMode);
            verifyForm.resetFields();
          }}
          optionType="button"
          buttonStyle="solid"
          block
        >
          <Radio.Button value="uis">复旦 UIS 验证</Radio.Button>
          <Radio.Button value="email">邮箱验证</Radio.Button>
        </Radio.Group>
        {verifyMode === 'email' ? (
          <>
            <Alert
              type="info"
              showIcon
              className={styles.verifyModeAlert}
              description={<span>请输入完整邮箱地址，系统将发送包含验证链接的邮件。</span>}
            />
            <Form form={verifyForm} layout="vertical" className={styles.verifyForm}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效邮箱地址' },
                ]}
              >
                <Input
                  prefix={<RiMailLine size={18} className={styles.verifyEmailIcon} />}
                  placeholder="请输入完整邮箱地址"
                  allowClear
                />
              </Form.Item>
            </Form>
          </>
        ) : (
          <>
            <Alert
              type="info"
              showIcon
              className={styles.verifyModeAlert}
              description={
                <span>
                  使用复旦大学统一身份认证（UIS）账号与密码发起认证，请按后续提示完成验证。
                </span>
              }
            />
            <Form form={verifyForm} layout="vertical" className={styles.verifyForm}>
              <Form.Item
                label="UIS 账号"
                name="uisAccount"
                rules={[{ required: true, message: '请输入 UIS 账号' }]}
              >
                <Input
                  prefix={<RiShieldUserLine size={18} className={styles.verifyEmailIcon} />}
                  placeholder="学工号或 UIS 账号"
                  allowClear
                  autoComplete="username"
                />
              </Form.Item>
              <Form.Item
                label="UIS 密码"
                name="uisPassword"
                rules={[{ required: true, message: '请输入 UIS 密码' }]}
              >
                <Input.Password placeholder="UIS 密码" autoComplete="current-password" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      <Modal
        title={uisAwaitingScan ? '请扫码完成 UIS 验证' : 'UIS 认证'}
        open={uisOutcomeOpen && uisOutcome != null}
        onCancel={handleUisOutcomeModalClose}
        closable
        maskClosable={!uisAwaitingScan}
        keyboard={!uisAwaitingScan}
        footer={
          uisAwaitingScan
            ? null
            : [
                <Button key="ok" type="primary" onClick={handleUisOutcomeModalClose}>
                  知道了
                </Button>,
              ]
        }
        width={440}
        destroyOnHidden
        centered
      >
        {uisOutcome != null && (
          <div className={styles.uisOutcomeBody}>
            {uisAwaitingScan ? (
              <>
                {uisOutcome.actionPayload.trim() === '' ? (
                  <Alert type="warning" showIcon title="未返回二维码数据，请稍后重试或联系管理员" />
                ) : uisQrImageSrc != null ? (
                  <>
                    <Alert
                      type="info"
                      showIcon
                      className={styles.uisOutcomeHint}
                      title="请使用复旦大学 UIS 相关应用或微信等扫码完成验证。"
                    />
                    <div className={styles.uisQrWrap}>
                      <img src={uisQrImageSrc} alt="UIS 验证二维码" className={styles.uisQrImg} />
                    </div>
                  </>
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    title="二维码图片数据无效"
                    description="服务端应返回 PNG 或 JPEG 的 base64 编码字符串；也可使用 data:image/png;base64, 前缀格式。"
                  />
                )}
              </>
            ) : (
              <Alert
                type="success"
                showIcon
                title="认证成功"
                description={uisOutcome.message.trim() !== '' ? uisOutcome.message : undefined}
              />
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default AccountVerification;
