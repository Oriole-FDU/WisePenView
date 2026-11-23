/**
 * domains - 业务 Domain Service 统一对外入口（barrel）
 *
 * Component / Hook：useXxxService()；Runtime 等命令式代码：getServices() / getXxxService()。
 */
export type { ServicesContextValue } from './_registry';
export {
  getChatTurnService,
  getServices,
  ServicesProvider,
  useAdminService,
  useAgentService,
  useAuthService,
  useChatConfigService,
  useChatSessionService,
  useChatTurnService,
  useCourseService,
  useDocumentService,
  useDriveService,
  useGroupService,
  useHtmlPageService,
  useImageService,
  useInlineCommentService,
  useMessageService,
  useNoteService,
  useResourceAccessService,
  useResourceCommentService,
  useResourceFavoriteService,
  useResourceInteractionService,
  useResourceService,
  useSkillService,
  useSpeechService,
  useTagService,
  useUserService,
  useUserTaskService,
  useUserTourService,
  useUserVerificationService,
  useWalletService,
} from './_registry';
export type { HtmlPageDisplayInfo, HtmlPageVersionInfo, IHtmlPageService } from './HtmlPage';
export { isHtmlPageReady } from './HtmlPage';
export type { IMessageService, UserMessage } from './Message';
export type { FeedbackType, SubmitFeedbackRequest } from './User';
export { FEEDBACK_TYPE } from './User';
