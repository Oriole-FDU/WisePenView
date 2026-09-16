import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { useAppNavigation } from '@/layouts/AppNavigation/AppNavigationContext';

function CommandPaletteTrigger() {
  const { t } = useTranslation('shell');
  const { openCommandPalette } = useAppNavigation();

  return (
    <AppIconButton
      icon={<Search size={18} aria-hidden="true" />}
      label={t('commandPalette.open')}
      tooltip={{
        content: t('commandPalette.tooltip'),
        placement: 'bottom',
      }}
      onPress={openCommandPalette}
    />
  );
}

export default CommandPaletteTrigger;
