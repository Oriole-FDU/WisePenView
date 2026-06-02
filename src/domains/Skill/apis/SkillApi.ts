import { apiGet } from '@/apis/request';
import type {
  SkillDetailApiRequest,
  SkillDetailApiResponse,
  SkillListApiResponse,
} from './SkillApi.type';

function listSkills(): Promise<SkillListApiResponse> {
  return apiGet('/skill/listSkills');
}

function getSkillDetail(req: SkillDetailApiRequest): Promise<SkillDetailApiResponse> {
  return apiGet('/skill/getSkillDetail', { params: { skill_id: req.skillId } });
}

export const SkillApi = {
  listSkills,
  getSkillDetail,
};
