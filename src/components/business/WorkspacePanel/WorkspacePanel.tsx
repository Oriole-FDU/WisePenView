import { clsx } from 'clsx';
import { PanelRightClose } from 'lucide-react';
import { useId } from 'react';

import AppIconButton from '@/components/base/Button/AppIconButton';

import type { WorkspacePanelHeaderProps, WorkspacePanelProps } from './index.type';
import styles from './style.module.scss';

/** 工作区右侧面板共用的标题栏与内容骨架。 */
export function WorkspacePanelHeader({
  title,
  titleId,
  closeLabel,
  onClose,
  actions,
  className,
}: WorkspacePanelHeaderProps) {
  return (
    <header className={clsx(styles.header, className)}>
      {onClose ? (
        <AppIconButton
          icon={<PanelRightClose size={18} aria-hidden="true" />}
          label={closeLabel}
          onPress={onClose}
        />
      ) : null}
      <div className={styles.titleWrap}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

export default function WorkspacePanel({
  title,
  closeLabel,
  onClose,
  actions,
  className,
  contentClassName,
  children,
}: WorkspacePanelProps) {
  const titleId = useId();

  return (
    <section className={clsx(styles.root, className)} aria-labelledby={titleId}>
      <WorkspacePanelHeader
        title={title}
        titleId={titleId}
        closeLabel={closeLabel}
        onClose={onClose}
        actions={actions}
      />
      <div className={clsx(styles.content, contentClassName)}>{children}</div>
    </section>
  );
}
