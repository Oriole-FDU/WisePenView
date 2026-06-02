import { SkillApi } from '../apis/SkillApi';
import { mapApiSkillDetailToDetail, mapApiSkillItemToSummary } from '../mapper/SkillServices.map';
import type { ISkillService, PageResult, SkillDetail, SkillSummary } from './index.type';

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
