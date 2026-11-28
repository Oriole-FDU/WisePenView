import { useMemoizedFn } from 'ahooks';

import { useWorkspacePanelPortalContext } from '../_context';
import styles from '../style.module.scss';
import { getWorkspacePanelTargetId } from '../workspacePanelModel';
import type { WorkspacePanelTargetProps } from './index.type';

export function WorkspacePanelTarget({ panelId, active, labelledBy }: WorkspacePanelTargetProps) {
  const { registerRoot } = useWorkspacePanelPortalContext();
  const setRoot = useMemoizedFn((root: HTMLElement | null) => registerRoot(panelId, root));
  return (
    <section
      id={getWorkspacePanelTargetId(panelId)}
      className={styles.panelTarget}
      hidden={!active}
      inert={!active}
      aria-labelledby={labelledBy}
      aria-hidden={!active || undefined}
      ref={setRoot}
    />
  );
}
