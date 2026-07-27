import type { Group } from '@/domains/Group';
import type { ResourceSkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '../entity/agent';
import { buildAgentFromSkillTreeGroup } from './agent.mapper';

export interface SkillScopeTreeGroup {
  key: string;
  label: string;
  skills: ResourceSkillSummary[];
}

interface OtherSkillTreeGroup extends SkillScopeTreeGroup {
  sourceAgent: ChatAgentOption | null;
}

const getSkillTreeGroupKey = (agent: ChatAgentOption | null | undefined): string =>
  !agent || agent.agentType === 'PERSONAL' ? 'personal' : `group-${agent.groupId ?? agent.agentId}`;

const getSkillTreeGroupLabel = (agent: ChatAgentOption | null | undefined): string =>
  !agent || agent.agentType === 'PERSONAL' ? '' : agent.groupName || agent.label || '';

const buildCurrentAgentSkillTreeGroup = (
  agent: ChatAgentOption | null | undefined,
  skills: ResourceSkillSummary[]
): SkillScopeTreeGroup => ({
  key: getSkillTreeGroupKey(agent),
  label: getSkillTreeGroupLabel(agent),
  skills,
});

const isSkillInAgentScope = (
  skill: ResourceSkillSummary,
  agent: ChatAgentOption | null | undefined
): boolean => {
  // Agent 有明确 Skill 列表时，按 skillId 精确匹配
  if (agent?.defaultSkillIds && agent.defaultSkillIds.length > 0) {
    return agent.defaultSkillIds.includes(skill.skillId);
  }
  if (!agent || agent.agentType === 'PERSONAL') {
    return skill.scopeType !== 'GROUP';
  }
  return skill.scopeType === 'GROUP' && skill.groupId === agent.groupId;
};

export const getPrimarySkillsForAgent = (
  skills: ResourceSkillSummary[],
  agent: ChatAgentOption | null | undefined
): ResourceSkillSummary[] => skills.filter((skill) => isSkillInAgentScope(skill, agent));

export const buildAdvancedSkillTreeGroups = (
  skills: ResourceSkillSummary[],
  groups: Group[],
  currentAgent?: ChatAgentOption | null,
  currentAgentSkills: ResourceSkillSummary[] = []
): SkillScopeTreeGroup[] => {
  const groupSkillMap = new Map<string, ResourceSkillSummary[]>();
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
      label: '',
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

export const buildOtherSkillTreeGroups = (
  groups: SkillScopeTreeGroup[],
  currentAgent: ChatAgentOption | null
): OtherSkillTreeGroup[] =>
  groups.map((group) => ({
    ...group,
    sourceAgent: buildAgentFromSkillTreeGroup(group, currentAgent),
  }));
