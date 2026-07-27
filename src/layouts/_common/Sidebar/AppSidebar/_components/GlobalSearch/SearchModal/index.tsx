import AppIconButton from '@/components/Button/AppIconButton';
import { InputGroup } from '@/components/Input';
import { Modal } from '@/components/Overlay';
import { Kbd, TextField } from '@heroui/react';
import { useDebounce, useKeyPress } from 'ahooks';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SearchResultList from '../SearchResultList';
import type { SearchModalProps } from './index.type';
import styles from './style.module.less';

function SearchModal({ isOpen, onOpenChange }: SearchModalProps) {
  const { t } = useTranslation('resource');
  const [rawKeyword, setRawKeyword] = useState('');
  const debouncedKeyword = useDebounce(rawKeyword, { wait: 400 });

  const handleClose = () => {
    setRawKeyword('');
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

  // 全局搜索是 Spotlight/command-palette 形态，需要顶置轻浮层、零 padding body 和输入区分隔线，保留裸 Overlay Modal 作为定制例外。
  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="lg" placement="top" className={styles.container}>
          <Modal.Dialog className={styles.dialog}>
            <Modal.Body className={styles.body}>
              <div className={styles.header}>
                <Search className={styles.headerIcon} size={18} />
                <TextField
                  aria-label={t('search.inputAria')}
                  value={rawKeyword}
                  onChange={setRawKeyword}
                  className={styles.input}
                >
                  <InputGroup className={styles.inputGroup}>
                    <InputGroup.Input
                      autoFocus
                      placeholder={t('search.placeholder')}
                      className={styles.inputControl}
                    />
                    {rawKeyword ? (
                      <InputGroup.Suffix>
                        <AppIconButton
                          icon={<X size={14} aria-hidden="true" />}
                          label={t('search.clear')}
                          size="sm"
                          className={styles.clearButton}
                          onClick={() => setRawKeyword('')}
                        />
                      </InputGroup.Suffix>
                    ) : null}
                  </InputGroup>
                </TextField>
                <button
                  type="button"
                  className={styles.escapeButton}
                  aria-label={t('search.close')}
                  onClick={handleClose}
                >
                  <Kbd className={styles.escapeKbd}>Esc</Kbd>
                </button>
              </div>

              <Modal.DeferredContent fallback={<div className={styles.resultPlaceholder} />}>
                {() => <SearchResultList keyword={debouncedKeyword} onClose={handleClose} />}
              </Modal.DeferredContent>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default SearchModal;
