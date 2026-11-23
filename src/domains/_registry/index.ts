/**
 * Service 统一装配入口。正式与 mock 共用 registry.ts、service 和 mapper。
 * API 由 @domain-apis 在构建时选择 apis.impl.ts / apis.mock.ts。
 *
 * 新增服务时补齐 registry.types.ts、registry.ts、hooks.ts 和 domains/index.ts；
 * 新增 API 时补齐真实 API、DTO 与 mock API，并同步两个 API 出口。
 * Component / Hook：useXxxService()；Runtime 等命令式代码：getServices() / getXxxService()。
 * 不直接引用 service 实现或 registry 深路径。
 */

export {
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
} from './_context';
export { ServicesProvider } from './_context';
export { getChatSessionService, getChatTurnService, getServices } from './getServices';
export type { ServicesContextValue } from './registry.types';
