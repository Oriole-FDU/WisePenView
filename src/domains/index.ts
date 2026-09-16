/**
 * domains - 业务 Domain Service 统一对外入口（barrel）
 */
export type { ServicesContextValue } from './_registry';
export {
  ServicesProvider,
  useAdminService,
  useAgentService,
  useAuthService,
  useChatService,
  useCourseService,
  useDocumentService,
  useDriveService,
  useGroupService,
  useImageService,
  useInlineCommentService,
  useInteractService,
  useMessageService,
  useNoteService,
  useQuotaService,
  useResourcePermissionService,
  useResourceService,
  useSkillService,
  useSpeechService,
  useTagService,
  useUserService,
  useWalletService,
} from './_registry';
export type { IMessageService, UserMessage } from './Message';
export type { FeedbackType, SubmitFeedbackRequest } from './User';
export { FEEDBACK_TYPE } from './User';
