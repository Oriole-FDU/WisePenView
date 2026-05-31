import type { ISkillService, PageResult, SkillSummary, SkillDetail } from '../service/index.type';

const MOCK_SKILLS: SkillSummary[] = [
  {
    skillId: 'skill-personal-001',
    displayName: '代码审查',
    description: '检查代码质量与安全漏洞',
    icon: '🔍',
    status: 'ACTIVE',
    currentVersionId: 'ver-personal-001',
    scopeType: 'PERSONAL',
  },
  {
    skillId: 'skill-personal-002',
    displayName: '个人写作助手',
    description: '帮助整理个人表达与写作结构',
    icon: '✍️',
    status: 'ACTIVE',
    currentVersionId: 'ver-personal-002',
    scopeType: 'PERSONAL',
  },
  {
    skillId: 'skill-group-a-001',
    displayName: '英语讲解',
    description: '按英语小组的教学风格回答问题',
    icon: '📘',
    status: 'ACTIVE',
    currentVersionId: 'ver-group-a-001',
    scopeType: 'GROUP',
    groupId: 'group-a',
    groupName: '小组A',
  },
  {
    skillId: 'skill-group-a-002',
    displayName: '代码审查',
    description: '按小组A规范输出代码审查意见',
    icon: '🧪',
    status: 'ACTIVE',
    currentVersionId: 'ver-group-a-002',
    scopeType: 'GROUP',
    groupId: 'group-a',
    groupName: '小组A',
  },
  {
    skillId: 'skill-group-b-001',
    displayName: '数据分析',
    description: '根据小组B模板整理数据洞察',
    icon: '📊',
    status: 'ACTIVE',
    currentVersionId: 'ver-group-b-001',
    scopeType: 'GROUP',
    groupId: 'group-b',
    groupName: '小组B',
  },
  {
    skillId: 'skill-group-b-002',
    displayName: '英语讲解',
    description: '按小组B的英语答疑风格进行回复',
    icon: '🎓',
    status: 'ACTIVE',
    currentVersionId: 'ver-group-b-002',
    scopeType: 'GROUP',
    groupId: 'group-b',
    groupName: '小组B',
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
