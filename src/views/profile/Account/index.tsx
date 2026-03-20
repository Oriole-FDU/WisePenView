import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Descriptions,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Spin,
  Tooltip,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd';
import type { InputRef } from 'antd/es/input';
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiMailLine,
  RiPencilLine,
  RiShieldUserLine,
} from 'react-icons/ri';
import { useImageService, useUserService } from '@/contexts/ServicesContext';
import type {
  GetUserInfoResponse,
  InitiateUISVerifyRequest,
  SendEmailVerifyRequest,
  UpdateUserInfoRequest,
} from '@/services/User';
import {
  DEGREE_LEVEL_LABELS,
  getDegreeLevelLabel,
  getIdentityTypeLabel,
  getSexLabel,
  IDENTITY_TYPE,
  SEX_LABELS,
  USER_STATUS,
} from '@/constants/user';
import { usePendingVerifyEmailStore } from '@/store';
import { beforeUploadImageWithinLimit } from '@/utils/image';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getProfileFieldConfig, PROFILE_FIELDS } from '../profile.config';
import type { ProfileFieldKey } from '../profile.config';
import layout from '../style.module.less';

const { Option } = Select;

type ProfileFormValues = UpdateUserInfoRequest;

/** 从 GetUserInfoResponse 中按字段 key 取值（userInfo / userProfile 分流） */
function getProfileFieldValue(
  user: GetUserInfoResponse | null,
  key: ProfileFieldKey
): string | number | null | undefined {
  if (!user) return undefined;
  if (key === 'nickname' || key === 'realName') return user.userInfo[key] ?? undefined;
  return user.userProfile[key] ?? undefined;
}

/** 档案字段在只读 Input 中展示的文案（性别 / 学历为枚举文案） */
function getProfileDisplayString(user: GetUserInfoResponse | null, key: ProfileFieldKey): string {
  const raw = getProfileFieldValue(user, key);
  if (raw === null || raw === undefined || raw === '') return '-';
  if (key === 'sex') return getSexLabel(raw as number);
  if (key === 'degreeLevel') return getDegreeLevelLabel(raw as number);
  return String(raw);
}

const SexReadonlyInput = React.forwardRef<InputRef, { value?: number | null }>(({ value }, ref) => (
  <Input
    ref={ref}
    disabled
    readOnly
    value={value != null ? getSexLabel(value) : '-'}
    className={layout.editableInput}
  />
));
SexReadonlyInput.displayName = 'SexReadonlyInput';

const DegreeLevelReadonlyInput = React.forwardRef<InputRef, { value?: number | null }>(
  ({ value }, ref) => (
    <Input
      ref={ref}
      disabled
      readOnly
      value={value != null ? getDegreeLevelLabel(value) : '-'}
      className={layout.editableInput}
    />
  )
);
DegreeLevelReadonlyInput.displayName = 'DegreeLevelReadonlyInput';

function buildProfileFormValues(data: GetUserInfoResponse): ProfileFormValues {
  return {
    nickname: data.userInfo.nickname ?? undefined,
    realName: data.userInfo.realName ?? undefined,
    sex: data.userProfile.sex,
    university: data.userProfile.university ?? undefined,
    college: data.userProfile.college ?? undefined,
    major: data.userProfile.major ?? undefined,
    className: data.userProfile.className ?? undefined,
    enrollmentYear: data.userProfile.enrollmentYear ?? undefined,
    degreeLevel: data.userProfile.degreeLevel ?? undefined,
    academicTitle: data.userProfile.academicTitle ?? undefined,
  };
}

type VerifyModalFormValues = {
  email?: string;
  uisAccount?: string;
  uisPassword?: string;
};

type VerifyModalMode = 'email' | 'uis';

/**
 * UIS actionPayload 约定为二维码图片的 base64 字符（无 data: 前缀）；
 * 若带 `data:image/*;base64,` 亦可；会去掉 base64 段中的空白/换行。
 */
function resolveUisQrImageDataUrl(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const base64Sep = ';base64,';
  const sepIdx = lower.indexOf(base64Sep);
  if (lower.startsWith('data:image/') && sepIdx !== -1) {
    const prefix = raw.slice(0, sepIdx + base64Sep.length);
    const b64 = raw.slice(sepIdx + base64Sep.length).replace(/\s/g, '');
    return b64 ? `${prefix}${b64}` : null;
  }

  const compact = raw.replace(/\s/g, '');
  if (compact.length < 24 || !/^[A-Za-z0-9+/]+=*$/.test(compact)) {
    return null;
  }
  if (compact.startsWith('iVBORw0KGgo')) {
    return `data:image/png;base64,${compact}`;
  }
  if (compact.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${compact}`;
  }
  return `data:image/png;base64,${compact}`;
}

type UisOutcomeState = {
  /** false：仍处扫码阶段，禁止关闭弹窗；true：后端已 completed，可关闭并展示结果 */
  pollingCompleted: boolean;
  requireAction: boolean;
  actionPayload: string;
  message: string;
};

const Account: React.FC = () => {
  const userService = useUserService();
  const imageService = useImageService();
  const [user, setUser] = useState<GetUserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyMode, setVerifyMode] = useState<VerifyModalMode>('uis');
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [uisOutcomeOpen, setUisOutcomeOpen] = useState(false);
  const [uisOutcome, setUisOutcome] = useState<UisOutcomeState | null>(null);
  const uisPollAbortRef = useRef<AbortController | null>(null);
  const [form] = Form.useForm<ProfileFormValues>();
  const [verifyForm] = Form.useForm<VerifyModalFormValues>();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarFileList, setAvatarFileList] = useState<UploadFile[]>([]);
  const [avatarSubmitting, setAvatarSubmitting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const data = await userService.getFullUserInfo();
        setUser(data);
        form.setFieldsValue(buildProfileFormValues(data));
      } catch (err) {
        message.error(parseErrorMessage(err, '获取用户信息失败'));
      } finally {
        setLoading(false);
      }
    };
    void loadUser();
  }, [form]);

  useEffect(
    () => () => {
      uisPollAbortRef.current?.abort();
    },
    []
  );

  const identityType = user?.userInfo?.identityType ?? IDENTITY_TYPE.STUDENT;
  const fieldConfig = getProfileFieldConfig(identityType);
  const visibleFields = PROFILE_FIELDS.filter((f) => fieldConfig[f.key]);

  const readonlyFieldSet = useMemo(
    () => new Set(user?.readonlyFields ?? []),
    [user?.readonlyFields]
  );

  const handleSaveProfile = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const rf = new Set(user?.readonlyFields ?? []);
      const params: UpdateUserInfoRequest = {
        nickname:
          fieldConfig.nickname && !rf.has('nickname')
            ? values.nickname
            : (user?.userInfo?.nickname ?? undefined),
        realName:
          fieldConfig.realName && !rf.has('realName')
            ? values.realName
            : (user?.userInfo?.realName ?? undefined),
        sex: fieldConfig.sex && !rf.has('sex') ? values.sex : user?.userProfile?.sex,
        university:
          fieldConfig.university && !rf.has('university')
            ? (values.university ?? null)
            : (user?.userProfile?.university ?? null),
        college:
          fieldConfig.college && !rf.has('college')
            ? values.college
            : (user?.userProfile?.college ?? undefined),
        major:
          fieldConfig.major && !rf.has('major')
            ? values.major
            : (user?.userProfile?.major ?? undefined),
        className:
          fieldConfig.className && !rf.has('className')
            ? values.className
            : (user?.userProfile?.className ?? undefined),
        enrollmentYear:
          fieldConfig.enrollmentYear && !rf.has('enrollmentYear')
            ? values.enrollmentYear
            : (user?.userProfile?.enrollmentYear ?? undefined),
        degreeLevel:
          fieldConfig.degreeLevel && !rf.has('degreeLevel')
            ? values.degreeLevel
            : typeof user?.userProfile?.degreeLevel === 'number'
              ? user.userProfile.degreeLevel
              : undefined,
        academicTitle:
          fieldConfig.academicTitle && !rf.has('academicTitle')
            ? values.academicTitle
            : (user?.userProfile?.academicTitle ?? undefined),
      };
      await userService.updateUserInfo(params);
      const data = await userService.getFullUserInfo();
      setUser(data);
      form.setFieldsValue(buildProfileFormValues(data));
      setEditMode(false);
      message.success('保存成功');
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(parseErrorMessage(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      form.setFieldsValue(buildProfileFormValues(user));
    } else {
      form.resetFields();
    }
    setEditMode(false);
  };

  const openAvatarModal = () => {
    setAvatarFileList([]);
    setAvatarModalOpen(true);
  };

  const handleAvatarModalCancel = () => {
    setAvatarFileList([]);
    setAvatarModalOpen(false);
  };

  const handleAvatarModalOk = async () => {
    const raw = avatarFileList[0]?.originFileObj;
    if (!(raw instanceof File)) {
      message.warning('请选择头像图片');
      return Promise.reject(new Error('no_avatar_file'));
    }
    if (!user) {
      message.error('用户信息未加载，请稍后重试');
      return Promise.reject(new Error('no_user'));
    }
    setAvatarSubmitting(true);
    try {
      const { publicUrl } = await imageService.uploadImage({
        file: raw,
        isPublic: true,
        bizPath: 'user/avatar',
      });
      await userService.updateUserInfo({
        nickname: user.userInfo.nickname ?? undefined,
        realName: user.userInfo.realName ?? undefined,
        avatar: publicUrl,
      });
      const data = await userService.getFullUserInfo();
      setUser(data);
      form.setFieldsValue(buildProfileFormValues(data));
      message.success('头像已更新');
      setAvatarFileList([]);
      setAvatarModalOpen(false);
    } catch (err: unknown) {
      message.error(parseErrorMessage(err, '头像更新失败'));
    } finally {
      setAvatarSubmitting(false);
    }
  };

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
        setUser(data);
        form.setFieldsValue(buildProfileFormValues(data));
      } catch {
        /* 刷新用户信息失败时静默，避免打断用户关闭弹窗 */
      }
    })();
  };

  const setPendingVerifyEmail = usePendingVerifyEmailStore((s) => s.setEmail);

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

  const nickname = user?.userInfo?.nickname ?? user?.userInfo?.username ?? '未设置昵称';
  const avatarLetter = (user?.userInfo?.nickname ?? user?.userInfo?.username ?? '?')
    .charAt(0)
    .toUpperCase();
  const identityLabel =
    user?.userInfo?.identityType != null ? getIdentityTypeLabel(user.userInfo.identityType) : '';
  const optionsMap = {
    sex: Object.entries(SEX_LABELS).map(([value, label]) => (
      <Option key={value} value={Number(value)}>
        {label}
      </Option>
    )),
    degreeLevel: Object.entries(DEGREE_LEVEL_LABELS).map(([value, label]) => (
      <Option key={value} value={Number(value)}>
        {label}
      </Option>
    )),
  } as const;

  const uisQrImageSrc = resolveUisQrImageDataUrl(uisOutcome?.actionPayload ?? '');
  const uisAwaitingScan = uisOutcome != null && !uisOutcome.pollingCompleted;

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>账号管理</h1>
        <span className={layout.pageSubtitle}>管理您的账号信息</span>
      </div>
      {user?.userInfo?.status === USER_STATUS.UNVERIFIED && (
        <Alert
          type="warning"
          description="请通过邮箱验证或复旦 UIS 认证完成账号验证，否则部分功能可能无法正常使用。"
          showIcon
          action={
            <Button size="small" type="link" onClick={handleVerify}>
              去验证
            </Button>
          }
          className={layout.statusBanner}
        />
      )}
      <Spin spinning={loading}>
        <div className={layout.formSection}>
          {/* 头部信息 */}
          <div className={layout.accountHeader}>
            <div className={layout.accountHeaderLeft}>
              <Tooltip title="修改头像">
                <span
                  className={layout.avatarWrap}
                  role="button"
                  tabIndex={0}
                  onClick={openAvatarModal}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openAvatarModal();
                    }
                  }}
                >
                  <Avatar
                    size={96}
                    draggable={false}
                    className={layout.avatar}
                    src={user?.userInfo?.avatar ?? undefined}
                  >
                    {avatarLetter}
                  </Avatar>
                </span>
              </Tooltip>
              <div className={layout.accountInfo}>
                <div className={layout.nameRow}>
                  <span className={layout.nickname}>{nickname}</span>
                  {user?.userInfo?.username != null && (
                    <span className={layout.username}>{user.userInfo.username}</span>
                  )}
                </div>
                {identityLabel && <span className={layout.identityTag}>{identityLabel}</span>}
              </div>
            </div>
            {user?.userInfo?.status != null && (
              <span className={layout.statusGroup}>
                <span className={layout.statusText}>
                  {user.userInfo.status === USER_STATUS.UNVERIFIED
                    ? '未认证'
                    : user.userInfo.status === USER_STATUS.BANNED
                      ? '封禁'
                      : '已认证'}
                </span>
                <span
                  className={layout.statusIcon}
                  title={
                    user.userInfo.status === USER_STATUS.UNVERIFIED
                      ? '未认证'
                      : user.userInfo.status === USER_STATUS.BANNED
                        ? '封禁'
                        : '已认证'
                  }
                >
                  {user.userInfo.status === USER_STATUS.BANNED ? (
                    <RiCloseLine size={24} className={layout.statusIconBanned} />
                  ) : user.userInfo.status === USER_STATUS.UNVERIFIED ? (
                    <RiErrorWarningLine size={24} className={layout.statusIconUnverified} />
                  ) : (
                    <RiCheckLine size={24} className={layout.statusIconVerified} />
                  )}
                </span>
              </span>
            )}
          </div>

          <Divider className={layout.sectionDivider} />

          {/* 账号：普通展示，非表单控件 */}
          <h3 className={layout.sectionTitle}>账号</h3>
          <Descriptions column={2} layout="vertical" size="small" className={layout.descriptions}>
            <Descriptions.Item label="用户名">{user?.userInfo?.username ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="学工号">
              {user?.userInfo?.campusNo === 'PENDING' ? '-' : (user?.userInfo?.campusNo ?? '-')}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">{user?.userInfo?.email ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{user?.userInfo?.mobile ?? '-'}</Descriptions.Item>
          </Descriptions>

          <Divider className={layout.sectionDivider} />

          {/* 基本档案：编辑资料在第三栏 */}
          {fieldConfig.showProfileSection && (
            <div className={layout.profileSection}>
              <div className={layout.sectionHeader}>
                <h3 className={layout.sectionTitle}>基本档案</h3>
                {!editMode ? (
                  <Button
                    type="primary"
                    icon={<RiPencilLine size={16} />}
                    onClick={() => setEditMode(true)}
                  >
                    编辑资料
                  </Button>
                ) : null}
              </div>
              {editMode ? (
                <Form form={form} layout="vertical" className={layout.profileForm}>
                  <div className={layout.formFieldsGrid}>
                    {visibleFields.map((field) => {
                      const lockedByServer = readonlyFieldSet.has(field.key);
                      if (lockedByServer) {
                        if (field.key === 'sex') {
                          return (
                            <Form.Item key={field.key} name={field.key} label={field.label}>
                              <SexReadonlyInput />
                            </Form.Item>
                          );
                        }
                        if (field.key === 'degreeLevel') {
                          return (
                            <Form.Item key={field.key} name={field.key} label={field.label}>
                              <DegreeLevelReadonlyInput />
                            </Form.Item>
                          );
                        }
                        return (
                          <Form.Item key={field.key} name={field.key} label={field.label}>
                            <Input disabled readOnly className={layout.editableInput} />
                          </Form.Item>
                        );
                      }
                      return (
                        <Form.Item key={field.key} name={field.key} label={field.label}>
                          {field.type === 'input' ? (
                            <Input
                              placeholder={field.placeholder}
                              className={layout.editableInput}
                            />
                          ) : (
                            <Select
                              placeholder={field.placeholder}
                              allowClear
                              className={layout.editableInput}
                            >
                              {field.optionsKey ? optionsMap[field.optionsKey] : null}
                            </Select>
                          )}
                        </Form.Item>
                      );
                    })}
                  </div>
                  <div className={layout.formActions}>
                    <Form.Item className={layout.submitItem}>
                      <Button type="primary" onClick={handleSaveProfile} loading={saving}>
                        保存
                      </Button>
                      <Button onClick={handleCancelEdit} className={layout.cancelBtn}>
                        取消
                      </Button>
                    </Form.Item>
                  </div>
                </Form>
              ) : (
                <Descriptions
                  column={2}
                  layout="vertical"
                  size="small"
                  className={layout.descriptions}
                >
                  {visibleFields.map((field) => (
                    <Descriptions.Item key={field.key} label={field.label}>
                      {getProfileDisplayString(user, field.key)}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              )}
            </div>
          )}
        </div>
      </Spin>

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
          className={layout.verifyModeRadio}
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
              className={layout.verifyModeAlert}
              description={<span>请输入完整邮箱地址，系统将发送包含验证链接的邮件。</span>}
            />
            <Form form={verifyForm} layout="vertical" className={layout.verifyForm}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效邮箱地址' },
                ]}
              >
                <Input
                  prefix={<RiMailLine size={18} className={layout.verifyEmailIcon} />}
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
              className={layout.verifyModeAlert}
              description={
                <span>
                  使用复旦大学统一身份认证（UIS）账号与密码发起认证，请按后续提示完成验证。
                </span>
              }
            />
            <Form form={verifyForm} layout="vertical" className={layout.verifyForm}>
              <Form.Item
                label="UIS 账号"
                name="uisAccount"
                rules={[{ required: true, message: '请输入 UIS 账号' }]}
              >
                <Input
                  prefix={<RiShieldUserLine size={18} className={layout.verifyEmailIcon} />}
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
          <div className={layout.uisOutcomeBody}>
            {uisAwaitingScan ? (
              <>
                {uisOutcome.actionPayload.trim() === '' ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="未返回二维码数据，请稍后重试或联系管理员"
                  />
                ) : uisQrImageSrc != null ? (
                  <>
                    <Alert
                      type="info"
                      showIcon
                      className={layout.uisOutcomeHint}
                      message="请使用复旦大学 UIS 相关应用或微信等扫码完成验证。"
                    />
                    <div className={layout.uisQrWrap}>
                      <img src={uisQrImageSrc} alt="UIS 验证二维码" className={layout.uisQrImg} />
                    </div>
                  </>
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    message="二维码图片数据无效"
                    description="服务端应返回 PNG 或 JPEG 的 base64 编码字符串；也可使用 data:image/png;base64, 前缀格式。"
                  />
                )}
              </>
            ) : (
              <Alert
                type="success"
                showIcon
                message="认证成功"
                description={uisOutcome.message.trim() !== '' ? uisOutcome.message : undefined}
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="更换头像"
        open={avatarModalOpen}
        onCancel={handleAvatarModalCancel}
        destroyOnHidden
        confirmLoading={avatarSubmitting}
        okText="上传并保存"
        cancelText="取消"
        onOk={handleAvatarModalOk}
        width={440}
      >
        <p className={layout.avatarModalHint}>支持 JPG、PNG、GIF、WebP，单张不超过 5MB。</p>
        <Upload
          name="avatar"
          accept="image/*"
          maxCount={1}
          fileList={avatarFileList}
          beforeUpload={beforeUploadImageWithinLimit}
          onChange={({ fileList }) => setAvatarFileList(fileList)}
        >
          <Button type="default">选择图片</Button>
        </Upload>
      </Modal>
    </div>
  );
};

export default Account;
