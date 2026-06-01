/**
 * domains/_registry - Service 统一注册与注�?
 *
 * 本目录是项目中所�?Service 的「一处注册」入口。新增服务时，在 `registry.impl.ts`�?
 * `registry.mock.ts`、`registry.types.ts` �?`hooks.ts` 中按步骤补齐，即可让任意组件
 * 通过 useXxxService() 获取对应 Service 实例�?
 *
 * 业务侧不直接 import 本目录，而是通过 `@/domains` barrel 取用�?
 *
 * --- 运行模式 ---
 * - 开�?生产：使用真实实现（XxxServicesImpl�?
 * - 开发模式且 MODE === 'mock'：使�?Mock 实现（XxxServicesMock�?
 *
 * --- 新增服务完整流程 ---
 *
 * 由于 TypeScript 缺乏 Spring 式的 IOC 容器，所以需要手动注册�?
 * 假设你要新增一�?OrderService，需要依次完成：
 *
 * 1. �?src/domains/Order/ 下创建：
 *    - index.type.ts：定�?IOrderService 接口�?*Request 类型
 *    - OrderServices.impl.ts：实�?IOrderService，内部调用真�?API
 * 2. �?src/mocks/Order/ 下创建：
 *    - OrderServices.mock.ts：实�?IOrderService，返回假数据�?delay 模拟
 * 3. �?`registry.types.ts` 中新增类型字段（第四步）
 * 4. �?`registry.impl.ts` �?`registry.mock.ts` 中分别绑定真�?Mock 实现（第五~六步�?
 * 5. �?`hooks.ts` 中完成第七步：export const useOrderService = ...
 * 6. 通过 `src/domains/index.ts` barrel 重新导出新增�?hook
 */

export {
  useAdminService,
  useAuthService,
  useChatService,
  useDocumentService,
  useDriveService,
  useGroupService,
  useImageService,
  useNoteService,
  useQuotaService,
  useResourceService,
  useStickerService,
  useTagService,
  useUserService,
  useWalletService,
  useSkillService,
} from './hooks';
export type { ServicesContextValue } from './registry';
export { ServicesProvider } from './ServicesProvider';
