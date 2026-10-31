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
  useChatService,
  useChatSessionService,
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
  useWalletService,
} from './_registry';
export type { HtmlPageDisplayInfo, HtmlPageVersionInfo, IHtmlPageService } from './HtmlPage';
export { isHtmlPageReady } from './HtmlPage';
export type { IMessageService, UserMessage } from './Message';
export type { FeedbackType, SubmitFeedbackRequest } from './User';
export { FEEDBACK_TYPE } from './User';
