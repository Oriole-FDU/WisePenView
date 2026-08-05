import type { Group } from '@/domains/Group';
import { GROUP_TYPE } from '@/domains/Group';
import mockdata from './mockdata.json';

const groups = (mockdata.groups as Group[]).map((group) => ({
  ...group,
  groupMetaInfo: group.groupMetaInfo ?? {},
}));

export const getMockGroups = (): Group[] => groups;

export const findMockGroup = (groupId: string): Group | undefined =>
  groups.find((group) => group.groupId === groupId);

export const upsertMockGroup = (nextGroup: Group): void => {
  const index = groups.findIndex((group) => group.groupId === nextGroup.groupId);
  if (index >= 0) {
    groups[index] = structuredClone(nextGroup);
    return;
  }
  groups.unshift(structuredClone(nextGroup));
};

export const removeMockGroup = (groupId: string): void => {
  const index = groups.findIndex((group) => group.groupId === groupId);
  if (index >= 0) groups.splice(index, 1);
};

export const replaceMockAdvancedGroups = (advancedGroups: Group[]): void => {
  const otherGroups = groups.filter((group) => group.groupType !== GROUP_TYPE.ADVANCED);
  groups.splice(
    0,
    groups.length,
    ...advancedGroups.map((group) => structuredClone(group)),
    ...otherGroups
  );
};
