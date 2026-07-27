import DescriptionGrid from '@/components/DescriptionGrid';
import { Spin } from '@/components/Feedback';
import { useUserService } from '@/domains';
import type { UserAccountProfile } from '@/domains/User';
import { IDENTITY } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { Separator, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccountForm, AccountHeader, AccountVerification } from '../_components/Account';
import type { ProfileFieldKey } from '../profile.config';
import { getProfileFieldConfig, PROFILE_FIELDS } from '../profile.config';
import layout from '../style.module.less';

function Account() {
  const { t } = useTranslation(['profile', 'common']);
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

  const readonlyFieldSet = new Set((user?.readonlyFields ?? []) as ProfileFieldKey[]);
  const accountItems = [
    {
      key: 'username',
      label: t('account.username'),
      value: user?.userInfo?.username ?? t('placeholder.dash', { ns: 'common' }),
    },
    {
      key: 'campusNo',
      label: t('account.campusNo'),
      value:
        user?.userInfo?.campusNo === 'PENDING'
          ? t('placeholder.dash', { ns: 'common' })
          : (user?.userInfo?.campusNo ?? t('placeholder.dash', { ns: 'common' })),
    },
    {
      key: 'email',
      label: t('account.email'),
      value: user?.userInfo?.email ?? t('placeholder.dash', { ns: 'common' }),
    },
    {
      key: 'mobile',
      label: t('account.mobile'),
      value: user?.userInfo?.mobile ?? t('placeholder.dash', { ns: 'common' }),
    },
  ];

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>{t('account.title')}</h1>
        <span className={layout.pageSubtitle}>{t('account.subtitle')}</span>
      </div>
      <AccountVerification user={user} onUserInfoReload={reloadUserInfo} />
      <Spin spinning={loading}>
        <div className={layout.formSection}>
          <AccountHeader user={user} onUserInfoReload={reloadUserInfo} />

          <Separator className={layout.sectionDivider} />

          <h3 className={layout.sectionTitle}>{t('account.sectionTitle')}</h3>
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
