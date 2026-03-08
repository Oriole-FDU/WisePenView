import React, { useEffect, useState } from 'react';
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
  Select,
  Space,
  Spin,
} from 'antd';
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiPencilLine,
} from 'react-icons/ri';
import { UserServices } from '@/services/User';
import type {
  GetUserInfoResponse,
  SendEmailVerifyRequest,
  UpdateUserProfileRequest,
} from '@/services/User';
import {
  DEGREE_LEVEL_LABELS,
  EMAIL_SUFFIX_LABELS,
  EMAIL_SUFFIX_TYPE,
  getDegreeLevelLabel,
  getIdentityTypeLabel,
  getSexLabel,
  IDENTITY_TYPE,
  SEX_LABELS,
  USER_STATUS,
} from '@/constants/user';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getProfileFieldConfig, PROFILE_FIELDS } from './profile.config';
import styles from './style.module.less';

const { Option } = Select;

type ProfileFormValues = UpdateUserProfileRequest;

interface VerifyEmailFormValues {
  suffixType: SendEmailVerifyRequest['suffixType'];
}

const Account: React.FC = () => {
  const [user, setUser] = useState<GetUserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [form] = Form.useForm<ProfileFormValues>();
  const [verifyForm] = Form.useForm<VerifyEmailFormValues>();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const data = await UserServices.fetchUserInfo();
        setUser(data);
        form.setFieldsValue({
          nickname: data.nickname,
          realName: data.realName,
          sex: data.sex,
          university: data.university ?? undefined,
          college: data.college,
          major: data.major,
          className: data.className,
          enrollmentYear: data.enrollmentYear,
          degreeLevel: data.degreeLevel,
          academicTitle: data.academicTitle,
        });
      } catch (err) {
        message.error(parseErrorMessage(err, '获取用户信息失败'));
      } finally {
        setLoading(false);
      }
    };
    void loadUser();
  }, [form]);

  const identityType = user?.identityType ?? IDENTITY_TYPE.STUDENT;
  const fieldConfig = getProfileFieldConfig(identityType);
  const visibleFields = PROFILE_FIELDS.filter((f) => fieldConfig[f.key]);

  const handleSaveProfile = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const params: UpdateUserProfileRequest = {
        nickname: fieldConfig.nickname ? values.nickname : user?.nickname,
        realName: fieldConfig.realName ? values.realName : user?.realName,
        sex: fieldConfig.sex ? values.sex : user?.sex,
        university: fieldConfig.university ? (values.university ?? null) : (user?.university ?? null),
        college: fieldConfig.college ? values.college : user?.college,
        major: fieldConfig.major ? values.major : user?.major,
        className: fieldConfig.className ? values.className : user?.className,
        enrollmentYear: fieldConfig.enrollmentYear ? values.enrollmentYear : user?.enrollmentYear,
        degreeLevel: fieldConfig.degreeLevel ? values.degreeLevel : user?.degreeLevel,
        academicTitle: fieldConfig.academicTitle ? values.academicTitle : user?.academicTitle,
      };
      const updated = await UserServices.updateUserProfile(params);
      setUser(updated);
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
    form.resetFields();
    form.setFieldsValue({
      nickname: user?.nickname,
      realName: user?.realName,
      sex: user?.sex,
      university: user?.university ?? undefined,
      college: user?.college,
      major: user?.major,
      className: user?.className,
      enrollmentYear: user?.enrollmentYear,
      degreeLevel: user?.degreeLevel,
      academicTitle: user?.academicTitle,
    });
    setEditMode(false);
  };

  const handleVerify = () => {
    verifyForm.setFieldsValue({ suffixType: EMAIL_SUFFIX_TYPE.M_FUDAN });
    setVerifyModalOpen(true);
  };

  const handleVerifyModalCancel = () => {
    verifyForm.resetFields();
    setVerifyModalOpen(false);
  };

  const handleVerifySubmit = async () => {
    try {
      const values = await verifyForm.validateFields();
      const params: SendEmailVerifyRequest = { suffixType: values.suffixType };
      await UserServices.sendEmailVerify(params);
      message.success('验证邮件已发送，请前往学工号邮箱查收');
      verifyForm.resetFields();
      setVerifyModalOpen(false);
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(parseErrorMessage(err, '提交失败'));
    }
  };

  const emailSuffixOptions = Object.entries(EMAIL_SUFFIX_LABELS).map(([value, label]) => ({
    value: Number(value),
    label,
  }));

  const nickname = user?.nickname || '未设置昵称';
  const avatarLetter = (user?.nickname || user?.username || '?').charAt(0).toUpperCase();
  const identityLabel = user ? getIdentityTypeLabel(user.identityType) : '';
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

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>账号管理</h1>
        <span className={styles.pageSubtitle}>管理您的账号信息</span>
      </div>
      {user?.status === USER_STATUS.UNVERIFIED && (
        <Alert
          type="warning"
          description="请绑定邮箱以完成账号验证，否则部分功能可能无法正常使用。"
          showIcon
          action={
            <Button size="small" type="link" onClick={handleVerify}>
              去验证
            </Button>
          }
          className={styles.statusBanner}
        />
      )}
      <Spin spinning={loading}>
        <div className={styles.formSection}>


          {/* 头部信息 */}
          <div className={styles.accountHeader}>
            <div className={styles.accountHeaderLeft}>
              <Avatar size={64} className={styles.avatar}>
                {avatarLetter}
              </Avatar>
              <div className={styles.accountInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.nickname}>{nickname}</span>
                  {user?.username != null && (
                    <span className={styles.username}>{user.username}</span>
                  )}
                </div>
                {identityLabel && (
                  <span className={styles.identityTag}>{identityLabel}</span>
                )}
              </div>
            </div>
            {user?.status != null && (
              <span className={styles.statusGroup}>
                <span className={styles.statusText}>
                  {user.status === USER_STATUS.UNVERIFIED
                    ? '未认证'
                    : user.status === USER_STATUS.BANNED
                      ? '封禁'
                      : '已认证'}
                </span>
                <span
                  className={styles.statusIcon}
                  title={
                    user.status === USER_STATUS.UNVERIFIED
                      ? '未认证'
                      : user.status === USER_STATUS.BANNED
                        ? '封禁'
                        : '已认证'
                  }
                >
                  {user.status === USER_STATUS.BANNED ? (
                    <RiCloseLine size={24} className={styles.statusIconBanned} />
                  ) : user.status === USER_STATUS.UNVERIFIED ? (
                    <RiErrorWarningLine size={24} className={styles.statusIconUnverified} />
                  ) : (
                    <RiCheckLine size={24} className={styles.statusIconVerified} />
                  )}
                </span>
              </span>
            )}
          </div>

          <Divider className={styles.sectionDivider} />

          {/* 账号 */}
          <h3 className={styles.sectionTitle}>账号</h3>
          <Descriptions
            column={2}
            layout="vertical"
            size="small"
            className={styles.descriptions}
          >
            <Descriptions.Item label="用户名">{user?.username ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="学工号">{user?.campusNo ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{user?.email ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{user?.mobile ?? '-'}</Descriptions.Item>
          </Descriptions>

          <Divider className={styles.sectionDivider} />

          {/* 基本档案（管理员不展示） */}
          {fieldConfig.showProfileSection && (
            <div className={styles.profileSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>基本档案</h3>
                {!editMode ? (
                  <Button type="primary" icon={<RiPencilLine size={16} />} onClick={() => setEditMode(true)}>
                    编辑资料
                  </Button>
                ) : null}
              </div>
              {editMode ? (
                <Form form={form} layout="vertical" className={styles.profileForm}>
                  <div className={styles.formFieldsGrid}>
                    {visibleFields.map((field) => {
                      const disabledList = fieldConfig.disabledFields ?? [];
                      const isReadOnly = (
                        disabledList as readonly string[]
                      ).includes(field.key);
                      const displayValue =
                        field.key === 'sex'
                          ? (user?.sex != null ? getSexLabel(user.sex) : '-')
                          : field.key === 'degreeLevel'
                            ? (user?.degreeLevel != null
                              ? getDegreeLevelLabel(user.degreeLevel)
                              : '-')
                            : (user?.[field.key] ?? '-');
                      return (
                        <Form.Item key={field.key} label={field.label} name={field.key}>
                          {isReadOnly ? (
                            <div className={styles.readOnlyField}>{displayValue}</div>
                          ) : field.type === 'input' ? (
                            <Input
                              placeholder={field.placeholder}
                              className={styles.editableInput}
                            />
                          ) : (
                            <Select
                              placeholder={field.placeholder}
                              allowClear
                              className={styles.editableInput}
                            >
                              {field.optionsKey ? optionsMap[field.optionsKey] : null}
                            </Select>
                          )}
                        </Form.Item>
                      );
                    })}
                  </div>
                  <div className={styles.formActions}>
                    <Form.Item className={styles.submitItem}>
                      <Button type="primary" onClick={handleSaveProfile} loading={saving}>
                        保存
                      </Button>
                      <Button onClick={handleCancelEdit} className={styles.cancelBtn}>
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
                  className={styles.descriptions}
                >
                  {visibleFields.map((field) => (
                    <Descriptions.Item key={field.key} label={field.label}>
                      {field.key === 'sex'
                        ? (user?.sex != null ? getSexLabel(user.sex) : '-')
                        : field.key === 'degreeLevel'
                          ? (user?.degreeLevel != null
                            ? getDegreeLevelLabel(user.degreeLevel)
                            : '-')
                          : (user?.[field.key] ?? '-')}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              )}
            </div>
          )}
        </div>
      </Spin>

      <Modal
        title="验证邮箱"
        open={verifyModalOpen}
        onCancel={handleVerifyModalCancel}
        footer={[
          <Button key="cancel" onClick={handleVerifyModalCancel}>
            取消
          </Button>,
          <Button key="verify" type="primary" onClick={handleVerifySubmit}>
            验证
          </Button>,
        ]}
        width={480}
      >
        <Alert type="info" 
        showIcon
        description={
              <span>请选择邮箱后缀，系统将发送包含验证链接的邮件。</span>
        } />
        <Form form={verifyForm} layout="vertical" className={styles.verifyForm}>
          <Form.Item label="邮箱">
            <Space.Compact className={styles.verifyEmailGroup}>
              <Space.Addon>
                {user?.campusNo ?? '-'}
              </Space.Addon>
              <Form.Item
                name="suffixType"
                noStyle
                rules={[{ required: true, message: '请选择邮箱后缀' }]}
              >
                <Select
                  className={styles.verifyEmailSelect}
                  placeholder="请选择邮箱后缀"
                  options={emailSuffixOptions}
                />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Account;
