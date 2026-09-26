/** 调用点：App 和 Storybook 装配，各领域组件通过 useXxxService 消费；提供正式与 mock 共用的 Service 实例。 */
export { ServicesProvider } from './ServicesProvider';
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
  useResourcePermissionService,
  useResourceService,
  useSkillService,
  useSpeechService,
  useTagService,
  useUserService,
  useWalletService,
} from './useServices';
