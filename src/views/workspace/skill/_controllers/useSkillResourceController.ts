import { useInteractService, useSkillService } from '@/domains';
import { useRequest } from 'ahooks';

export function useSkillResourceController(resourceId: string) {
  const skillService = useSkillService();
  const interactService = useInteractService();

  const {
    data: skill,
    loading,
    error,
    refresh: refreshSkill,
  } = useRequest(() => skillService.getSkillDetail(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  useRequest(() => interactService.recordResourceRead(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  return {
    error,
    loading,
    refreshSkill,
    skill,
  };
}
