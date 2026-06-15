import SegmentedTabs from '@/components/Common/SegmentedTabs';
import { SEARCH_SCOPE, type SearchScope } from '@/domains/Resource';
import { InputGroup, Modal, TextField } from '@heroui/react';
import { useDebounce, useKeyPress } from 'ahooks';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import SearchResultList from '../SearchResultList';
import type { SearchModalProps } from './index.type';
import styles from './style.module.less';

function SearchModal({ isOpen, onOpenChange }: SearchModalProps) {
  const [rawKeyword, setRawKeyword] = useState('');
  const debouncedKeyword = useDebounce(rawKeyword, { wait: 400 });
  const [scope, setScope] = useState<SearchScope>(SEARCH_SCOPE.ALL);

  const handleClose = () => {
    setRawKeyword('');
    setScope(SEARCH_SCOPE.ALL);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    handleClose();
  };

  // Safari 下 Esc 关弹窗会顺带触发浏览器退出全屏；须在 keydown capture 阶段先拦截（退出全屏发生在 keydown，keyup 拦截已晚）
  useKeyPress(
    'esc',
    (e) => {
      if (!isOpen) return;
      e.preventDefault();
      e.stopPropagation();
      handleClose();
    },
    { events: ['keydown'], useCapture: true }
  );

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="lg" placement="top" className={styles.container}>
          <Modal.Dialog className={styles.dialog}>
            <Modal.Body className={styles.body}>
              <div className={styles.header}>
                <Search className={styles.headerIcon} size={18} />
                <TextField
                  aria-label="搜索文档、笔记和标签"
                  value={rawKeyword}
                  onChange={setRawKeyword}
                  className={styles.input}
                >
                  <InputGroup className={styles.inputGroup}>
                    <InputGroup.Input
                      autoFocus
                      placeholder="搜索文档、笔记和标签..."
                      className={styles.inputControl}
                    />
                    {rawKeyword ? (
                      <InputGroup.Suffix>
                        <button
                          type="button"
                          className={styles.clearButton}
                          aria-label="清空搜索"
                          onClick={() => setRawKeyword('')}
                        >
                          <X size={14} />
                        </button>
                      </InputGroup.Suffix>
                    ) : null}
                  </InputGroup>
                </TextField>
                <kbd className={styles.kbd} onClick={handleClose}>
                  Esc
                </kbd>
              </div>

              <div className={styles.tabs}>
                <SegmentedTabs<SearchScope>
                  ariaLabel="搜索范围"
                  items={SEARCH_SCOPE.options.map((option) => ({
                    key: option.value,
                    label: option.label,
                  }))}
                  selectedKey={scope}
                  onSelectionChange={setScope}
                  block
                />
              </div>

              <SearchResultList keyword={debouncedKeyword} scope={scope} onClose={handleClose} />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default SearchModal;
