/**
 * Service 统一装配入口。正式与 mock 共用 registry.ts、service 和 mapper。
 * API 由 @domain-apis 在构建时选择 apis.impl.ts / apis.mock.ts。
 *
 * 新增服务时补齐 registry.types.ts、registry.ts、hooks.ts 和 domains/index.ts；
 * 新增 API 时补齐真实 API、DTO 与 mock API，并同步两个 API 出口。
 * 业务代码通过 @/domains 的 useXxxService() 获取服务，不直接引用实现。
 */

export {
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
} from './hooks';
export type { ServicesContextValue } from './registry.types';
export { ServicesProvider } from './ServicesProvider';
