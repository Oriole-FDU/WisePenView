import { useTranslation } from 'react-i18next';
import styles from '../style.module.less';
import type { DropOverlayProps } from './index.type';

function DropOverlay({ visible }: DropOverlayProps) {
  const { t } = useTranslation('chat');

  return (
    <div
      className={styles.dropOverlay}
      data-visible={visible ? 'true' : 'false'}
      aria-hidden={!visible}
    >
      <span className={styles.dropOverlayLabel}>{t('input.dropOverlay')}</span>
    </div>
  );
}

export default DropOverlay;
