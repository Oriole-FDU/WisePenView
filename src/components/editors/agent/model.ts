import type { AgentDetail, AgentSpec } from '@/domains/Agent';
import type { ChatAgentOption, ChatModel, ToolOption } from '@/domains/Chat';
import type { SkillSummary } from '@/domains/Skill';

export interface AgentDraft {
  name: string;
  description: string;
  spec: AgentSpec;
}

export interface AgentVersionItem {
  key: string;
  version: number;
  current: boolean;
}

/** 汇总 Agent 编辑工作区所需的详情、可选模型、工具和技能数据。 */
export interface AgentWorkspaceData {
  agent: AgentDetail;
  isOwner: boolean;
  models: ChatModel[];
  tools: ToolOption[];
  skills: SkillSummary[];
}

/** 将草稿序列化为稳定快照，用于判断编辑内容是否发生变化。 */
export function snapshotAgentDraft(draft: AgentDraft): string {
  return JSON.stringify(draft);
}

/** 从 Agent 详情构建可编辑草稿，并复制 spec 避免直接修改原始数据。 */
export function buildAgentDraft(agent: AgentDetail): AgentDraft {
  return {
    name: agent.name,
    description: agent.description,
    spec: structuredClone(agent.spec),
  };
}

/** 根据草稿和已发布版本生成版本选择器所需的数据。 */
export function getAgentVersionItems(
  agent: AgentDetail | undefined,
  viewingVersion: number | null
): AgentVersionItem[] {
  if (!agent) return [];

  const items: AgentVersionItem[] = [
    {
      key: `v${agent.draftVersion}`,
      version: agent.draftVersion,
      current: viewingVersion === null,
    },
  ];
  for (let version = agent.publishedVersion; version >= 1; version -= 1) {
    if (version === agent.draftVersion) continue;
    items.push({ key: `v${version}`, version, current: viewingVersion === version });
  }
  return items;
}

/** 将当前编辑中的 Agent 草稿转换为聊天面板可使用的 Agent 选项。 */
export function buildCurrentDraftAgent(
  agent: AgentDetail,
  draft: AgentDraft,
  fallbackLabel: string
): ChatAgentOption {
  return {
    agentId: `current-agent-draft-${agent.resourceId}`,
    agentType: 'PERSONAL',
    source: 'CURRENT_DRAFT',
    resourceId: agent.resourceId,
    agentVersion: agent.draftVersion,
    label: agent.title || draft.name || fallbackLabel,
  };
}
