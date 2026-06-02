import type { SkillSummary } from '@/domains';
import type { ChatAgentOption } from '@/store';
import type { Group } from '@/types/group';

export interface SkillScopeTreeGroup {
  key: string;
  label: string;
  skills: SkillSummary[];
}

export const getSkillScopeLabel = (skill: SkillSummary): string =>
  skill.scopeType === 'GROUP' ? skill.groupName || '小组' : '个人';

const getSkillTreeGroupKey = (agent: ChatAgentOption | null | undefined): string =>
  !agent || agent.agentType === 'PERSONAL' ? 'personal' : `group-${agent.groupId ?? agent.agentId}`;

const getSkillTreeGroupLabel = (agent: ChatAgentOption | null | undefined): string =>
  !agent || agent.agentType === 'PERSONAL' ? '个人' : agent.groupName || agent.label || '小组';

const buildCurrentAgentSkillTreeGroup = (
  agent: ChatAgentOption | null | undefined,
  skills: SkillSummary[]
): SkillScopeTreeGroup => ({
  key: getSkillTreeGroupKey(agent),
  label: getSkillTreeGroupLabel(agent),
  skills,
});

const isSkillInAgentScope = (
  skill: SkillSummary,
  agent: ChatAgentOption | null | undefined
): boolean => {
  if (!agent || agent.agentType === 'PERSONAL') {
    return skill.scopeType !== 'GROUP';
  }
  return skill.scopeType === 'GROUP' && skill.groupId === agent.groupId;
};

export const getPrimarySkillsForAgent = (
  skills: SkillSummary[],
  agent: ChatAgentOption | null | undefined
): SkillSummary[] => skills.filter((skill) => isSkillInAgentScope(skill, agent));

export const getAllowedSkillsForChat = (
  skills: SkillSummary[],
  agent: ChatAgentOption | null | undefined,
  advancedMode: boolean
): SkillSummary[] => (advancedMode ? skills : getPrimarySkillsForAgent(skills, agent));

export const buildAdvancedSkillTreeGroups = (
  skills: SkillSummary[],
  groups: Group[],
  currentAgent?: ChatAgentOption | null,
  currentAgentSkills: SkillSummary[] = []
): SkillScopeTreeGroup[] => {
  const groupSkillMap = new Map<string, SkillSummary[]>();
  skills
    .filter((skill) => skill.scopeType === 'GROUP' && skill.groupId)
    .forEach((skill) => {
      const groupId = skill.groupId!;
      const existing = groupSkillMap.get(groupId) ?? [];
      existing.push(skill);
      groupSkillMap.set(groupId, existing);
    });

  const orderedGroups: SkillScopeTreeGroup[] = groups
    .map((group) => ({
      key: `group-${group.groupId}`,
      label: group.groupName,
      skills: groupSkillMap.get(group.groupId) ?? [],
    }))
    .filter((item) => item.skills.length > 0);

  const knownGroupIds = new Set(groups.map((group) => group.groupId));
  const extraGroups = Array.from(groupSkillMap.entries())
    .filter(([groupId]) => !knownGroupIds.has(groupId))
    .map(([groupId, groupSkills]) => ({
      key: `group-${groupId}`,
      label: groupSkills[0]?.groupName || groupId,
      skills: groupSkills,
    }));

  const personalSkills = skills.filter((skill) => skill.scopeType !== 'GROUP');
  const result = [...orderedGroups, ...extraGroups];
  if (personalSkills.length > 0) {
    result.push({
      key: 'personal',
      label: '个人',
      skills: personalSkills,
    });
  }

  if (currentAgent) {
    const currentGroup = buildCurrentAgentSkillTreeGroup(currentAgent, currentAgentSkills);
    const alreadyIncluded = result.some((group) => group.key === currentGroup.key);
    if (!alreadyIncluded) {
      if (currentGroup.key === 'personal') {
        result.push(currentGroup);
      } else {
        const personalIndex = result.findIndex((group) => group.key === 'personal');
        if (personalIndex === -1) {
          result.push(currentGroup);
        } else {
          result.splice(personalIndex, 0, currentGroup);
        }
      }
    }
  }

  return result;
};
