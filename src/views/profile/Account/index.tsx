import React, { useEffect, useMemo, useState } from 'react';
import { Descriptions, Divider, Form, message, Spin } from 'antd';
import { useUserService } from '@/contexts/ServicesContext';
import type { GetUserInfoResponse } from '@/services/User';
import { IDENTITY_TYPE } from '@/constants/user';
import {
  AccountForm,
  AccountHeader,
  AccountVerification,
  buildProfileFormValues,
  type ProfileFormValues,
} from '@/components/Account';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getProfileFieldConfig, PROFILE_FIELDS } from '../profile.config';
import type { ProfileFieldKey } from '../profile.config';
import layout from '../style.module.less';

const Account: React.FC = () => {
  const userService = useUserService();
  const [user, setUser] = useState<GetUserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm<ProfileFormValues>();

  const handleUserInfoUpdated = (data: GetUserInfoResponse) => {
    setUser(data);
    form.setFieldsValue(buildProfileFormValues(data));
  };

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

  const identityType = user?.userInfo?.identityType ?? IDENTITY_TYPE.STUDENT;
  const fieldConfig = getProfileFieldConfig(identityType);
  const visibleFields = PROFILE_FIELDS.filter((f) => fieldConfig[f.key]);

  const readonlyFieldSet = useMemo(
    () => new Set((user?.readonlyFields ?? []) as ProfileFieldKey[]),
    [user?.readonlyFields]
  );

  const handleCancelEdit = () => {
    if (user) {
      form.setFieldsValue(buildProfileFormValues(user));
    } else {
      form.resetFields();
    }
    setEditMode(false);
  };

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>账号管理</h1>
        <span className={layout.pageSubtitle}>管理您的账号信息</span>
      </div>
      <AccountVerification user={user} onUserInfoUpdated={handleUserInfoUpdated} />
      <Spin spinning={loading}>
        <div className={layout.formSection}>
          <AccountHeader user={user} onUserInfoUpdated={handleUserInfoUpdated} />

          <Divider className={layout.sectionDivider} />

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

          <AccountForm
            show={fieldConfig.showProfileSection}
            user={user}
            form={form}
            fieldConfig={fieldConfig}
            visibleFields={visibleFields}
            readonlyFieldSet={readonlyFieldSet}
            editMode={editMode}
            onEditModeChange={setEditMode}
            onUserInfoUpdated={handleUserInfoUpdated}
            onCancel={handleCancelEdit}
          />
        </div>
      </Spin>
    </div>
  );
};

export default Account;
