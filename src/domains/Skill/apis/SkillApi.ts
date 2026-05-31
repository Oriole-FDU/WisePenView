import { apiGet } from '@/apis/request';
import type {
  SkillListApiResponse,
  SkillDetailApiRequest,
  SkillDetailApiResponse,
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
