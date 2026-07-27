import { ACCESS_CONTROL_SCOPE } from '@/domains/Tag';
import { Tabs } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import styles from '../style.module.less';

interface GroupPolicyShellCardProps {
  title: string;
}

const POLICY_SCOPE_OPTIONS = [
  { scope: ACCESS_CONTROL_SCOPE.ALL, labelKey: 'permission.scope.all' },
  { scope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN, labelKey: 'permission.scope.adminOnly' },
  { scope: ACCESS_CONTROL_SCOPE.BLACKLIST, labelKey: 'permission.scope.blacklist' },
  { scope: ACCESS_CONTROL_SCOPE.WHITELIST, labelKey: 'permission.scope.whitelist' },
] as const;

function GroupPolicyShellCard({ title }: GroupPolicyShellCardProps) {
  const { t } = useTranslation('group');
  return (
    <section className={styles.personnelCard} aria-label={title}>
      <div className={styles.personnelHeader}>
        <div className={styles.personnelTitle}>{title}</div>
      </div>
      <Tabs className={styles.scopeTabs} selectedKey={String(ACCESS_CONTROL_SCOPE.ALL)}>
        <Tabs.ListContainer className={styles.scopeTabsListContainer}>
          <Tabs.List
            className={styles.scopeTabsList}
            aria-label={t('permission.scopeAria', { title })}
          >
            {POLICY_SCOPE_OPTIONS.map((option) => (
              <Tabs.Tab
                key={option.scope}
                id={String(option.scope)}
                className={styles.scopeTab}
                isDisabled
              >
                {t(option.labelKey)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <div className={styles.memberState}>{t('permission.allMembers')}</div>
    </section>
  );
}

export default GroupPolicyShellCard;
