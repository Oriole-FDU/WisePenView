export type SkillScopeType = 'PERSONAL' | 'GROUP';

export interface SkillSummary {
  skillId: string;
  displayName: string;
  description: string;
  icon?: string;
  status: string;
  currentVersionId?: string;
  scopeType: SkillScopeType;
  groupId?: string;
  groupName?: string;
}

export interface SkillDetail {
  skillId: string;
  displayName: string;
  description: string;
  icon?: string;
  status: string;
  currentVersionId?: string;
  scopeType: SkillScopeType;
  groupId?: string;
  groupName?: string;
  versions: SkillVersion[];
}

export interface SkillVersion {
  versionId: string;
  versionNumber: number;
  versionKind: string;
  publishStatus: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  total_page: number;
}

export interface ISkillService {
  listSkills(): Promise<PageResult<SkillSummary>>;
  getSkillDetail(skillId: string): Promise<SkillDetail>;
}
