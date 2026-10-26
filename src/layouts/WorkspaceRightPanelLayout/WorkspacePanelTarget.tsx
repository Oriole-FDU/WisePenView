import { useMemoizedFn } from 'ahooks';

import { useWorkspacePanelPortalContext } from './_context';
import styles from './style.module.scss';
import { getWorkspacePanelTargetId, type WorkspacePanelId } from './workspacePanelModel';

export function WorkspacePanelTarget({
  panelId,
  active,
  labelledBy,
}: {
  panelId: WorkspacePanelId;
  active: boolean;
  labelledBy: string;
}) {
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
