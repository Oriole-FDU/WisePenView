export interface SkillListApiResponse {
  list: SkillApiItem[];
  total: number;
  page: number;
  size: number;
  total_page: number;
}

export interface SkillApiItem {
  skill_id: string;
  display_name: string;
  description: string;
  icon?: string;
  visibility: string;
  status: string;
  current_active_version_id?: string;
  scope_type?: 'PERSONAL' | 'GROUP';
  group_id?: string;
  group_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SkillDetailApiRequest {
  skillId: string;
}

export interface SkillDetailApiResponse {
  skill_id: string;
  display_name: string;
  description: string;
  icon?: string;
  visibility: string;
  status: string;
  current_active_version_id?: string;
  scope_type?: 'PERSONAL' | 'GROUP';
  group_id?: string;
  group_name?: string;
  versions: SkillVersionApiItem[];
  created_at: string;
  updated_at: string;
}

export interface SkillVersionApiItem {
  version_id: string;
  version_number: number;
  version_kind: string;
  publish_status: string;
  created_at: string;
}
