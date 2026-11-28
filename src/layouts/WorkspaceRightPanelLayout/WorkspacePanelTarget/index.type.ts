import type { WorkspacePanelId } from '../workspacePanelModel';

export type WorkspacePanelTargetProps = {
  panelId: WorkspacePanelId;
  active: boolean;
  labelledBy: string;
};
