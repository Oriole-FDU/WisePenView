import { SkillApi } from '../apis/SkillApi';
import type { ISkillService, PageResult, SkillSummary, SkillDetail } from './index.type';
import { mapApiSkillItemToSummary, mapApiSkillDetailToDetail } from '../mapper/SkillServices.map';

const listSkills = async (): Promise<PageResult<SkillSummary>> => {
  const data = await SkillApi.listSkills();
  return {
    list: (data.list ?? []).map(mapApiSkillItemToSummary),
    total: data.total ?? 0,
    page: data.page ?? 1,
    size: data.size ?? 20,
    total_page: data.total_page ?? 0,
  };
};

const getSkillDetail = async (skillId: string): Promise<SkillDetail> => {
  const data = await SkillApi.getSkillDetail({ skillId });
  return mapApiSkillDetailToDetail(data);
};

export const createSkillServices = (): ISkillService => ({
  listSkills,
  getSkillDetail,
});
