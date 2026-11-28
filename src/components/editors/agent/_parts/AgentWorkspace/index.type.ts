import type { AgentDetail } from '@/domains/Agent';

import type { AgentVersionItem, AgentWorkspaceData } from '../../_common/model';

export interface AgentWorkspaceProps {
  agent: AgentDetail;
  data: AgentWorkspaceData;
  disabledVersionKeys: Set<string>;
  isOwner: boolean;
  resourceId: string;
  versionItems: AgentVersionItem[];
  versionLoading: boolean;
  viewingVersion: number | null;
  onRefresh: () => void;
  onVersionSelect: (version: number) => void;
}
