import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import IconText from '@/components/Common/IconText';
import type { ResourceViewerHeaderProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_FALLBACK_TO = '/app/drive';
const DEFAULT_BACK_LABEL = '返回';

function ResourceViewerHeader({
  fallbackTo = DEFAULT_FALLBACK_TO,
  backLabel = DEFAULT_BACK_LABEL,
  inlineTitle,
  extra,
  titleBlock,
  className,
}: ResourceViewerHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(fallbackTo, { replace: true });
  };

  return (
    <header className={clsx(styles.root, className)}>
      <div className={styles.bar}>
        <div className={styles.toolbar}>
          <button type="button" className={styles.backLink} onClick={handleBack}>
            <IconText icon={<ArrowLeft />} iconSize={18} gap="var(--ant-margin-xs)">
              {backLabel}
            </IconText>
          </button>
          <div className={styles.toolbarMiddle}>
            {inlineTitle ? <div className={styles.inlineTitle}>{inlineTitle}</div> : null}
          </div>
          <div className={styles.toolbarEnd}>{extra}</div>
        </div>
      </div>
      {titleBlock ? (
        <div className={styles.titleBlock}>
          <div className={styles.titleBlockInner}>{titleBlock}</div>
        </div>
      ) : null}
    </header>
  );
}

export default ResourceViewerHeader;
