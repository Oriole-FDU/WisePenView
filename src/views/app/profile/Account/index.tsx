import { AccountForm, AccountHeader, AccountVerification } from '@/components/Account';
import { useUserService } from '@/domains';
import type { GetUserInfoResponse } from '@/domains/User';
import { IDENTITY } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Descriptions, Divider, Spin } from 'antd';
import { useMemo, useState } from 'react';
import type { ProfileFieldKey } from '../profile.config';
import { getProfileFieldConfig, PROFILE_FIELDS } from '../profile.config';
import layout from '../style.module.less';

function Account() {
  const userService = useUserService();
  const [user, setUser] = useState<GetUserInfoResponse | null>(null);
  const [editMode, setEditMode] = useState(false);

  const handleUserInfoUpdated = (data: GetUserInfoResponse) => {
    setUser(data);
  };

  const { loading } = useRequest(() => userService.getFullUserInfo(), {
    onSuccess: (data) => {
      setUser(data);
    },
    onError: (err: unknown) => {
      toast.danger(parseErrorMessage(err));
    },
  });

  const identityType = user?.userInfo?.identityType ?? IDENTITY.STUDENT;
  const fieldConfig = getProfileFieldConfig(identityType);
  const visibleFields = PROFILE_FIELDS.filter((f) => fieldConfig[f.key]);

  const readonlyFieldSet = useMemo(
    () => new Set((user?.readonlyFields ?? []) as ProfileFieldKey[]),
    [user?.readonlyFields]
  );

  const handleCancelEdit = () => {
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
}

export default Account;
