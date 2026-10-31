import type { ResourceSkillSummary } from '@/domains/Resource';

import type { CapabilityToolOption } from '../entity/config';

interface SkillScopeTreeGroup {
  key: string;
  label: string;
  skills: ResourceSkillSummary[];
}

interface ChatInputToolCandidate extends CapabilityToolOption {
  configured: boolean;
}

export function selectChatInputWebSearchTools(
  tools: readonly ChatInputToolCandidate[]
): CapabilityToolOption[] {
  // 后端暂未提供工具分类字段，聊天入口按约定的 `_search` 后缀识别 Web Search。
  return tools
    .filter((tool) => tool.configured && tool.toolId.endsWith('_search'))
    .map(({ toolId, label }) => ({ toolId, label }));
}

export function mapChatInputToolSelectionOverrides(
  toolOptions: readonly CapabilityToolOption[],
  selectedTools: readonly CapabilityToolOption[]
): Record<string, boolean> | undefined {
  if (toolOptions.length === 0) return undefined;

  const selectedToolIds = new Set(selectedTools.map((tool) => tool.toolId));
  return Object.fromEntries(
    toolOptions.map((tool) => [tool.toolId, selectedToolIds.has(tool.toolId)])
  );
}

type CapabilityPickerItemKind = 'primary-skill' | 'external-skill' | 'tool';

interface CapabilityPickerItem {
  key: string;
  kind: CapabilityPickerItemKind;
  label: string;
  checked?: boolean;
  skill?: ResourceSkillSummary;
  tool?: CapabilityToolOption;
}

interface CapabilityPickerSection {
  key: string;
  items: CapabilityPickerItem[];
}

export interface CapabilitySkillSelection {
  skillId: string;
  displayName: string;
  currentVersionId?: string;
  scopeType?: 'PERSONAL' | 'GROUP';
  groupId?: string;
  groupName?: string;
  sourceAgentId?: string;
  sourceAgentLabel?: string;
  external?: boolean;
}

interface BuildCapabilityPickerSectionsInput {
  primarySkills: ResourceSkillSummary[];
  selectedSkills: CapabilitySkillSelection[];
  selectedTools: CapabilityToolOption[];
  toolOptions: CapabilityToolOption[];
  advancedMode: boolean;
  otherSkillGroups: SkillScopeTreeGroup[];
}

export function buildCapabilityPickerSections(
  input: BuildCapabilityPickerSectionsInput
): CapabilityPickerSection[] {
  const {
    primarySkills,
    selectedSkills,
    selectedTools,
    toolOptions,
    advancedMode,
    otherSkillGroups,
  } = input;

  const selectedSkillIdSet = new Set(selectedSkills.map((s) => s.skillId));
  const selectedToolIdSet = new Set(selectedTools.map((t) => t.toolId));

  const sections: CapabilityPickerSection[] = [];

  // Primary skills
  if (primarySkills.length > 0) {
    sections.push({
      key: 'primary-skills',
      items: primarySkills.map((skill) => ({
        key: skill.skillId,
        kind: 'primary-skill' as const,
        label: skill.displayName,
        checked: selectedSkillIdSet.has(skill.skillId),
        skill,
      })),
    });
  }

  // External skills (advanced mode only)
  if (advancedMode) {
    const orderMap = new Map(otherSkillGroups.map((group, index) => [group.key, index]));
    const externalItems: CapabilityPickerItem[] = selectedSkills
      .filter((item) => item.external)
      .sort((a, b) => {
        const aKey = a.groupId ? `group-${a.groupId}` : 'personal';
        const bKey = b.groupId ? `group-${b.groupId}` : 'personal';
        return (
          (orderMap.get(aKey) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(bKey) ?? Number.MAX_SAFE_INTEGER)
        );
      })
      .map((item) => ({
        key: item.skillId,
        kind: 'external-skill' as const,
        label: item.displayName,
        checked: true,
      }));

    sections.push({
      key: 'external-skills',
      items: externalItems,
    });
  }

  // Tools
  if (toolOptions.length > 0) {
    sections.push({
      key: 'tools',
      items: toolOptions.map((tool) => ({
        key: tool.toolId,
        kind: 'tool' as const,
        label: tool.label,
        checked: selectedToolIdSet.has(tool.toolId),
        tool,
      })),
    });
  }

  return sections;
}
