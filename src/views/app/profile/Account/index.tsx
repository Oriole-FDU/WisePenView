import DescriptionGrid from '@/components/Common/DescriptionGrid';
import { Spin } from '@/components/Common/Feedback';
import { useUserService } from '@/domains';
import type { UserAccountProfile } from '@/domains/User';
import { IDENTITY } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { Separator, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo, useState } from 'react';
import { AccountForm, AccountHeader, AccountVerification } from '../_components/Account';
import type { ProfileFieldKey } from '../profile.config';
import { getProfileFieldConfig, PROFILE_FIELDS } from '../profile.config';
import layout from '../style.module.less';

function Account() {
  const userService = useUserService();
  const [user, setUser] = useState<UserAccountProfile | null>(null);

  const { loading, runAsync: reloadUserInfo } = useRequest(() => userService.getFullUserInfo(), {
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
  const accountItems = useMemo(
    () => [
      { key: 'username', label: '用户名', value: user?.userInfo?.username ?? '-' },
      {
        key: 'campusNo',
        label: '学工号',
        value: user?.userInfo?.campusNo === 'PENDING' ? '-' : (user?.userInfo?.campusNo ?? '-'),
      },
      { key: 'email', label: '邮箱', value: user?.userInfo?.email ?? '-' },
      { key: 'mobile', label: '手机号', value: user?.userInfo?.mobile ?? '-' },
    ],
    [
      user?.userInfo?.campusNo,
      user?.userInfo?.email,
      user?.userInfo?.mobile,
      user?.userInfo?.username,
    ]
  );

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>账号管理</h1>
        <span className={layout.pageSubtitle}>管理您的账号信息</span>
      </div>
      <AccountVerification user={user} onUserInfoReload={reloadUserInfo} />
      <Spin spinning={loading}>
        <div className={layout.formSection}>
          <AccountHeader user={user} onUserInfoReload={reloadUserInfo} />

          <Separator className={layout.sectionDivider} />

          <h3 className={layout.sectionTitle}>账号</h3>
          <DescriptionGrid items={accountItems} columns={2} className={layout.descriptions} />

          <Separator className={layout.sectionDivider} />

          <AccountForm
            show={fieldConfig.showProfileSection}
            user={user}
            fieldConfig={fieldConfig}
            visibleFields={visibleFields}
            readonlyFieldSet={readonlyFieldSet}
            onUserInfoReload={reloadUserInfo}
          />
        </div>
      </Spin>
    </div>
  );
}

export default Account;
