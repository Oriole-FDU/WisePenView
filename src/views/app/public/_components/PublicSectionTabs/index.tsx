import { Tabs } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import underlineTabs from '@/views/app/_common/underlineTabs.module.less';

import styles from './style.module.less';

export type PublicSectionKey = 'groups' | 'courses';

export interface PublicSectionTabsProps {
  selectedKey: PublicSectionKey;
}

function PublicSectionTabs({ selectedKey }: PublicSectionTabsProps) {
  const { t } = useTranslation('group');
  const navigate = useNavigate();
  const items = [
    { key: 'groups', label: t('list.myGroups'), to: APP_ROUTE_PATH.GROUPS },
    { key: 'courses', label: t('list.myCourses'), to: APP_ROUTE_PATH.COURSES },
  ] satisfies Array<{ key: PublicSectionKey; label: string; to: string }>;

  return (
    <Tabs
      variant="secondary"
      className={underlineTabs.underlineTabs}
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        const item = items.find((candidate) => candidate.key === String(key));
        if (item) navigate(item.to);
      }}
    >
      <Tabs.ListContainer>
        <Tabs.List className={styles.list} aria-label={t('list.navigationAria')}>
          {items.map((item) => (
            <Tabs.Tab key={item.key} id={item.key} className={styles.tab}>
              {item.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}

export default PublicSectionTabs;
