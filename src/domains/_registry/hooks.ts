import { use } from 'react';

import type { IAdminService } from '@/domains/Admin';
import type { IAgentService } from '@/domains/Agent';
import type { IAuthService } from '@/domains/Auth';
import type { IChatService } from '@/domains/Chat';
import type { ICourseService } from '@/domains/Course';
import type { IDocumentService } from '@/domains/Document';
import type { IDriveService } from '@/domains/Drive';
import type { IGroupService } from '@/domains/Group';
import type { IImageService } from '@/domains/Image';
import type { IInlineCommentService } from '@/domains/InlineComment';
import type { IInteractService } from '@/domains/Interact';
import type { IMessageService } from '@/domains/Message';
import type { INoteService } from '@/domains/Note';
import type { IQuotaService } from '@/domains/Quota';
import type { IResourcePermissionService, IResourceService } from '@/domains/Resource';
import type { ISkillService } from '@/domains/Skill';
import type { ISpeechService } from '@/domains/Speech';
import type { ITagService } from '@/domains/Tag';
import type { IUserService } from '@/domains/User';
import type { IWalletService } from '@/domains/Wallet';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { ServicesContext } from './context';
import type { ServicesContextValue } from './registry.types';

/** 内部 hook，供 useXxxService 复用；必须在 ServicesProvider 内使用 */
function useServicesContext(): ServicesContextValue {
  const ctx = use(ServicesContext);
  if (!ctx) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useServicesContext must be used within ServicesProvider',
    });
  }
  return ctx;
}

export const useAdminService = (): IAdminService => useServicesContext().adminService;
export const useAgentService = (): IAgentService => useServicesContext().agentService;
export const useAuthService = (): IAuthService => useServicesContext().authService;
export const useChatService = (): IChatService => useServicesContext().chatService;
export const useCourseService = (): ICourseService => useServicesContext().courseService;
export const useDocumentService = (): IDocumentService => useServicesContext().documentService;
export const useDriveService = (): IDriveService => useServicesContext().driveService;
export const useGroupService = (): IGroupService => useServicesContext().groupService;
export const useImageService = (): IImageService => useServicesContext().imageService;
export const useInlineCommentService = (): IInlineCommentService =>
  useServicesContext().inlineCommentService;
export const useInteractService = (): IInteractService => useServicesContext().interactService;
export const useMessageService = (): IMessageService => useServicesContext().messageService;
export const useNoteService = (): INoteService => useServicesContext().noteService;
export const useQuotaService = (): IQuotaService => useServicesContext().quotaService;
export const useResourcePermissionService = (): IResourcePermissionService =>
  useServicesContext().resourcePermissionService;
export const useResourceService = (): IResourceService => useServicesContext().resourceService;
export const useSkillService = (): ISkillService => useServicesContext().skillService;
export const useSpeechService = (): ISpeechService => useServicesContext().speechService;
export const useTagService = (): ITagService => useServicesContext().tagService;
export const useUserService = (): IUserService => useServicesContext().userService;
/** 个人中心钱包、高级组 token 相关页注入 */
export const useWalletService = (): IWalletService => useServicesContext().walletService;
