/**
 * domains - 业务 Domain Service 统一对外入口（barrel）
 */
export type { ServicesContextValue } from './_registry';
export {
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
  useFeedbackService,
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
  useWalletService,
} from './_registry';
export type { FeedbackType, SubmitFeedbackRequest } from './Feedback';
export { FEEDBACK_TYPE } from './Feedback';
export type { HtmlPageDisplayInfo, HtmlPageVersionInfo, IHtmlPageService } from './HtmlPage';
export { isHtmlPageReady } from './HtmlPage';
export type { IMessageService, UserMessage } from './Message';
