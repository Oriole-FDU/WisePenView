import IconText from '@/components/Common/IconText';
import { Button } from '@heroui/react';
import { useKeyPress } from 'ahooks';
import { Search } from 'lucide-react';
import { useState } from 'react';
import SearchModal from './SearchModal';
import type { GlobalSearchBoxProps } from './index.type';
import styles from './style.module.less';

const IS_MAC = navigator.platform.toLowerCase().includes('mac');
const SHORTCUT_LABEL = IS_MAC ? '⌘ K' : 'Ctrl K';

/** 工具栏图标按钮触发器 + 受控 Modal；监听 ctrl/⌘+K 打开 */
function GlobalSearchBox({ className }: GlobalSearchBoxProps) {
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
      <Button variant="secondary" className={className} onPress={() => setOpen(true)}>
        <IconText icon={<Search />} iconSize={16}>
          搜索
        </IconText>
        <kbd className={styles.triggerKbd}>{SHORTCUT_LABEL}</kbd>
      </Button>
      <SearchModal isOpen={open} onOpenChange={setOpen} />
    </>
  );
}

export default GlobalSearchBox;
