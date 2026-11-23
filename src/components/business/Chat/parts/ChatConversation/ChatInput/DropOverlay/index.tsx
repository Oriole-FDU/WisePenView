import { useTranslation } from 'react-i18next';

import type { DropOverlayProps } from './index.type';
import styles from './style.module.scss';

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
