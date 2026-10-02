import { useInteractService, useSkillService, useUserService } from '@/domains';
import type { SkillDetail } from '@/domains/Skill';
import { useApi } from '@/hooks/useApi';

interface SkillResourceData {
  currentUserId: string;
  isOwner: boolean;
  skill: SkillDetail;
}

export function useSkillResourceController(resourceId: string) {
  const skillService = useSkillService();
  const interactService = useInteractService();
  const userService = useUserService();

  const {
    data,
    loading,
    error,
    refresh: refreshSkill,
  } = useApi(
    async (): Promise<SkillResourceData> => {
      const currentUser = await userService.getUserInfo();
      const baseSkill = await skillService.getSkillDetail(resourceId);
      const isOwner = Boolean(baseSkill.ownerId && baseSkill.ownerId === currentUser.id);
      const targetVersion = isOwner ? baseSkill.draftVersion : baseSkill.version;
      const skill =
        targetVersion > 0
          ? await skillService.getSkillVersionFiles(resourceId, targetVersion)
          : baseSkill;
      return { currentUserId: currentUser.id, isOwner, skill };
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  useApi(() => interactService.recordResourceRead(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  return {
    currentUserId: data?.currentUserId,
    error,
    isOwner: data?.isOwner ?? false,
    loading,
    refreshSkill,
    skill: data?.skill,
  };
}
