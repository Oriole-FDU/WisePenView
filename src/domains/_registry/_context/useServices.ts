import type { IAdminService } from '@/domains/Admin';
import type { IAgentService } from '@/domains/Agent';
import type { IAuthService } from '@/domains/Auth';
import type { IChatConfigService } from '@/domains/ChatConfig';
import type { IChatSessionService } from '@/domains/ChatSession';
import type { IChatTurnService } from '@/domains/ChatTurn';
import type { ICourseService } from '@/domains/Course';
import type { IDocumentService } from '@/domains/Document';
import type { IDriveService } from '@/domains/Drive';
import type { IFeedbackService } from '@/domains/Feedback';
import type { IGroupService } from '@/domains/Group';
import type { IHtmlPageService } from '@/domains/HtmlPage';
import type { IImageService } from '@/domains/Image';
import type { IInlineCommentService } from '@/domains/InlineComment';
import type { IMessageService } from '@/domains/Message';
import type { INoteService } from '@/domains/Note';
import type { IResourceService } from '@/domains/Resource';
import type { IResourceAccessService } from '@/domains/ResourceAccess';
import type { IResourceCommentService } from '@/domains/ResourceComment';
import type { IResourceFavoriteService } from '@/domains/ResourceFavorite';
import type { IResourceInteractionService } from '@/domains/ResourceInteraction';
import type { ISkillService } from '@/domains/Skill';
import type { ISpeechService } from '@/domains/Speech';
import type { ITagService } from '@/domains/Tag';
import type { IUserService } from '@/domains/User';
import type { IUserTaskService } from '@/domains/UserTask';
import type { IUserTourService } from '@/domains/UserTour';
import type { IWalletService } from '@/domains/Wallet';
import { useRequiredContext } from '@/hooks/useRequiredContext';

import type { ServicesContextValue } from '../registry.types';
import { ServicesContext } from './ServicesContext';

/** 内部 hook，供 useXxxService 复用；必须在 ServicesProvider 内使用 */
function useServicesContext(): ServicesContextValue {
  return useRequiredContext(ServicesContext, 'ServicesProvider');
}

export const useAdminService = (): IAdminService => useServicesContext().adminService;
export const useAgentService = (): IAgentService => useServicesContext().agentService;
export const useAuthService = (): IAuthService => useServicesContext().authService;
export const useChatConfigService = (): IChatConfigService =>
  useServicesContext().chatConfigService;
export const useChatSessionService = (): IChatSessionService =>
  useServicesContext().chatSessionService;
export const useChatTurnService = (): IChatTurnService => useServicesContext().chatTurnService;
export const useCourseService = (): ICourseService => useServicesContext().courseService;
export const useDocumentService = (): IDocumentService => useServicesContext().documentService;
export const useDriveService = (): IDriveService => useServicesContext().driveService;
export const useFeedbackService = (): IFeedbackService => useServicesContext().feedbackService;
export const useGroupService = (): IGroupService => useServicesContext().groupService;
export const useHtmlPageService = (): IHtmlPageService => useServicesContext().htmlPageService;
export const useImageService = (): IImageService => useServicesContext().imageService;
export const useInlineCommentService = (): IInlineCommentService =>
  useServicesContext().inlineCommentService;
export const useMessageService = (): IMessageService => useServicesContext().messageService;
export const useNoteService = (): INoteService => useServicesContext().noteService;
export const useResourceAccessService = (): IResourceAccessService =>
  useServicesContext().resourceAccessService;
export const useResourceCommentService = (): IResourceCommentService =>
  useServicesContext().resourceCommentService;
export const useResourceFavoriteService = (): IResourceFavoriteService =>
  useServicesContext().resourceFavoriteService;
export const useResourceInteractionService = (): IResourceInteractionService =>
  useServicesContext().resourceInteractionService;
export const useResourceService = (): IResourceService => useServicesContext().resourceService;
export const useSkillService = (): ISkillService => useServicesContext().skillService;
export const useSpeechService = (): ISpeechService => useServicesContext().speechService;
export const useTagService = (): ITagService => useServicesContext().tagService;
export const useUserService = (): IUserService => useServicesContext().userService;
export const useUserTaskService = (): IUserTaskService => useServicesContext().userTaskService;
export const useUserTourService = (): IUserTourService => useServicesContext().userTourService;
/** 个人中心钱包、高级组 token 相关页注入 */
export const useWalletService = (): IWalletService => useServicesContext().walletService;
