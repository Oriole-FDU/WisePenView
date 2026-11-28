import type { TFunction } from 'i18next';

import type { useSkillFileActionsController } from '../../_hooks/useSkillFileActionsController';
import type { useSkillNavigationController } from '../../_hooks/useSkillNavigationController';

export interface SkillActionDialogsProps {
  fileActions: SkillFileActions;
  navigation: SkillNavigation;
  t: TFunction<'skill'>;
}

export type SkillFileActions = ReturnType<typeof useSkillFileActionsController>;

export type SkillNavigation = ReturnType<typeof useSkillNavigationController>;
