import AppIconButton from '@/components/Button/AppIconButton';
import { getModKeyLabel } from '@/utils/platform';
import { useKeyPress } from 'ahooks';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SearchModal from './SearchModal';

const SHORTCUT_LABEL = `${getModKeyLabel()}+K`;

/** 侧边栏图标按钮触发器 + 受控 Modal；监听 ctrl/⌘+K 打开 */
function GlobalSearch() {
  const { t } = useTranslation('resource');
  const [open, setOpen] = useState(false);

  useKeyPress(
    ['ctrl.k', 'meta.k'],
    (e) => {
      e.preventDefault();
      setOpen(true);
    },
    { exactMatch: true }
  );

  return (
    <>
      <AppIconButton
        icon={<Search size={18} aria-hidden="true" />}
        label={t('search.action')}
        tooltip={{
          content: t('search.tooltip', { shortcut: SHORTCUT_LABEL }),
          placement: 'bottom',
        }}
        onPress={() => setOpen(true)}
      />
      <SearchModal isOpen={open} onOpenChange={setOpen} />
    </>
  );
}

export default GlobalSearch;
