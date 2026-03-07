import type { UserGroupQuota } from '@/types/quota';

export const mockUserGroupQuotas: UserGroupQuota[] = [
  { groupId: '1', groupName: '前端开发小组', quotaLimit: 5000, quotaUsed: 1500 },
  { groupId: '2', groupName: '设计创意组', quotaLimit: 5000, quotaUsed: 800 },
  { groupId: '3', groupName: '测试小组', quotaLimit: 5000, quotaUsed: 200 },
  { groupId: '4', groupName: '后端架构团队', quotaLimit: 10000, quotaUsed: 7500 },
  { groupId: '5', groupName: '产品规划组', quotaLimit: 10000, quotaUsed: 1000 },
  { groupId: '6', groupName: '运营推广团队', quotaLimit: 8000, quotaUsed: 6500 },
  { groupId: '7', groupName: '技术分享集市', quotaLimit: 100000, quotaUsed: 20000 },
  { groupId: '8', groupName: '学术研究集市', quotaLimit: 100000, quotaUsed: 55000 },
  { groupId: '9', groupName: '创新创业集市', quotaLimit: 100000, quotaUsed: 30000 },
  { groupId: '10', groupName: '数据分析小组', quotaLimit: 5000, quotaUsed: 5000 },
  { groupId: '11', groupName: '移动开发组', quotaLimit: 5000, quotaUsed: 1200 },
  { groupId: '12', groupName: 'UI/UX 设计组', quotaLimit: 5000, quotaUsed: 400 },
];
