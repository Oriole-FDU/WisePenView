import type { ISkillService, PageResult, SkillDetail, SkillSummary } from '../service/index.type';

const MOCK_SKILLS: SkillSummary[] = [
  {
    skillId: 'skill-personal-001',
    displayName: 'Skill 1',
    description: 'Personal skill A',
    icon: '🔍',
    status: 'ACTIVE',
    currentVersionId: 'ver-001',
    scopeType: 'PERSONAL',
  },
  {
    skillId: 'skill-personal-002',
    displayName: 'Skill 2',
    description: 'Personal skill B',
    icon: '✍️',
    status: 'ACTIVE',
    currentVersionId: 'ver-002',
    scopeType: 'PERSONAL',
  },
  {
    skillId: 'skill-group-a-001',
    displayName: 'Skill 3',
    description: 'Group A skill',
    icon: '🌍',
    status: 'ACTIVE',
    currentVersionId: 'ver-003',
    scopeType: 'GROUP',
    groupId: 'group-a',
    groupName: 'Group A',
  },
  {
    skillId: 'skill-group-a-002',
    displayName: 'Skill 4',
    description: 'Group A skill B',
    icon: '🔎',
    status: 'ACTIVE',
    currentVersionId: 'ver-004',
    scopeType: 'GROUP',
    groupId: 'group-a',
    groupName: 'Group A',
  },
  {
    skillId: 'skill-group-b-001',
    displayName: 'Skill 5',
    description: 'Group B skill',
    icon: '📊',
    status: 'ACTIVE',
    currentVersionId: 'ver-005',
    scopeType: 'GROUP',
    groupId: 'group-b',
    groupName: 'Group B',
  },
  {
    skillId: 'skill-group-b-002',
    displayName: 'Skill 6',
    description: 'Group B skill B',
    icon: '💁',
    status: 'ACTIVE',
    currentVersionId: 'ver-006',
    scopeType: 'GROUP',
    groupId: 'group-b',
    groupName: 'Group B',
  },
];

const listSkills: ISkillService['listSkills'] = async () =>
  new Promise<PageResult<SkillSummary>>((resolve) => {
    setTimeout(() => {
      resolve({
        list: MOCK_SKILLS,
        total: MOCK_SKILLS.length,
        page: 1,
        size: MOCK_SKILLS.length,
        total_page: 1,
      });
    }, 120);
  });

const getSkillDetail: ISkillService['getSkillDetail'] = async (skillId: string) => {
  const skill = MOCK_SKILLS.find((item) => item.skillId === skillId);
  if (!skill) throw new Error('Skill not found');
  return new Promise<SkillDetail>((resolve) => {
    setTimeout(() => {
      resolve({
        ...skill,
        versions: [
          {
            versionId: skill.currentVersionId ?? 'latest',
            versionNumber: 1,
            versionKind: 'RELEASE',
            publishStatus: 'PUBLISHED',
          },
        ],
      });
    }, 80);
  });
};

export const SkillServicesMock: ISkillService = {
  listSkills,
  getSkillDetail,
};
