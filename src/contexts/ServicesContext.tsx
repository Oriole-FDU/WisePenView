/**
 * ServicesContext - Service 统一注册与注入
 *
 * 本文件是项目中所有 Service 的「一处注册」入口。新增服务时，仅需在本文件中完成 7 步注册，
 * 即可让任意组件通过 useXxxService() hook 获取对应 Service 实例。
 *
 * --- 运行模式 ---
 * - 开发/生产：使用真实实现（XxxServicesImpl）
 * - 开发模式且 MODE === 'mock'：使用 Mock 实现（XxxServicesMock）
 *
 * --- 新增服务完整流程 ---
 *
 * 由于TypeScript缺乏Spring框架的IOC容器，所以需要手动注册。
 * 假设你要新增一个 OrderService，需要依次完成：
 *
 * 1. 在 src/services/Order/ 下创建：
 *    - index.type.ts：定义 IOrderService 接口及 *Request 类型
 *    - OrderServices.impl.ts：实现 IOrderService，内部调用真实 API
 * 2. 在 src/mocks/Order/ 下创建：
 *    - OrderServices.mock.ts：实现 IOrderService，返回假数据或 delay 模拟
 * 3. 回到本文件，按下方「第一步」～「第七步」依次添加注册代码
 *
 */

import React, { createContext, useContext } from 'react';

// ==================== 新增服务时：按以下 7 步依次添加 ====================

// 第一步：导入该服务的接口类型
import type { IAuthService } from '@/services/Auth';
import type { IDocumentService } from '@/services/Document';
import type { IFolderService } from '@/services/Folder';
import type { IGroupService } from '@/services/Group';
import type { IImageService } from '@/services/Image';
import type { INoteService } from '@/services/Note';
import type { IQuotaService } from '@/services/Quota';
import type { IResourceService } from '@/services/Resource';
import type { ITagService } from '@/services/Tag';
import type { IUserService } from '@/services/User';

// 第二步：导入真实实现（*Services.impl.ts，调用后端 API）
import { AuthServicesImpl } from '@/services/Auth/AuthServices.impl';
import { DocumentServicesImpl } from '@/services/Document/DocumentServices.impl';
import { FolderServicesImpl } from '@/services/Folder/FolderServices.impl';
import { GroupServicesImpl } from '@/services/Group/GroupServices.impl';
import { ImageServicesImpl } from '@/services/Image/ImageServices.impl';
import { NoteServicesImpl } from '@/services/Note/NoteServices.impl';
import { QuotaServicesImpl } from '@/services/Quota/QuotaServices.impl';
import { ResourceServicesImpl } from '@/services/Resource/ResourceServices.impl';
import { TagServicesImpl } from '@/services/Tag/TagServices.impl';
import { UserServicesImpl } from '@/services/User/UserServices.impl';

// 第三步：导入 Mock 实现（src/mocks/Xxx/XxxServices.mock.ts，用于 MODE === 'mock' 时）
import { AuthServicesMock } from '@/mocks/Auth/AuthServices.mock';
import { DocumentServicesMock } from '@/mocks/Document/DocumentServices.mock';
import { FolderServicesMock } from '@/mocks/Folder/FolderServices.mock';
import { GroupServicesMock } from '@/mocks/Group/GroupServices.mock';
import { ImageServicesMock } from '@/mocks/Image/ImageServices.mock';
import { NoteServicesMock } from '@/mocks/Note/NoteServices.mock';
import { QuotaServicesMock } from '@/mocks/Quota/QuotaServices.mock';
import { ResourceServicesMock } from '@/mocks/Resource/ResourceServices.mock';
import { TagServicesMock } from '@/mocks/Tag/TagServices.mock';
import { UserServicesMock } from '@/mocks/User/UserServices.mock';

// 第四步：在 ServicesContextValue 中新增该服务的类型
// Context 通过此 interface 与 Service/Mock 层约定「有哪些服务可被注入」
export interface ServicesContextValue {
  auth: IAuthService;
  document: IDocumentService;
  folder: IFolderService;
  group: IGroupService;
  image: IImageService;
  note: INoteService;
  quota: IQuotaService;
  resource: IResourceService;
  tag: ITagService;
  user: IUserService;
}

// 第五步：在 servicesValue 中绑定真实实现
const servicesValue: ServicesContextValue = {
  auth: AuthServicesImpl,
  document: DocumentServicesImpl,
  folder: FolderServicesImpl,
  group: GroupServicesImpl,
  image: ImageServicesImpl,
  note: NoteServicesImpl,
  quota: QuotaServicesImpl,
  resource: ResourceServicesImpl,
  tag: TagServicesImpl,
  user: UserServicesImpl,
};

// 第六步：在 mockServicesValue 中绑定 Mock 实现
const mockServicesValue: ServicesContextValue = {
  auth: AuthServicesMock,
  document: DocumentServicesMock,
  folder: FolderServicesMock,
  group: GroupServicesMock,
  image: ImageServicesMock,
  note: NoteServicesMock,
  quota: QuotaServicesMock,
  resource: ResourceServicesMock,
  tag: TagServicesMock,
  user: UserServicesMock,
};

// 第七步：导出 useXxxService hook，组件内通过 useOrderService() 等获取实例
export const useAuthService = (): IAuthService => useServicesContext().auth;
export const useDocumentService = (): IDocumentService => useServicesContext().document;
export const useFolderService = (): IFolderService => useServicesContext().folder;
export const useGroupService = (): IGroupService => useServicesContext().group;
export const useImageService = (): IImageService => useServicesContext().image;
export const useNoteService = (): INoteService => useServicesContext().note;
export const useQuotaService = (): IQuotaService => useServicesContext().quota;
export const useResourceService = (): IResourceService => useServicesContext().resource;
export const useTagService = (): ITagService => useServicesContext().tag;
export const useUserService = (): IUserService => useServicesContext().user;

// ==================== 以上为新增服务时的 7 步注册 ====================

// ========== Context 实现（以下内容无需修改） ==========
const ServicesContext = createContext<ServicesContextValue | null>(null);

/** 根据运行环境选择真实实现或 Mock：MODE === 'mock' 时使用 mockServicesValue */
function getContextValue(): ServicesContextValue {
  if (import.meta.env.MODE === 'mock') {
    return mockServicesValue;
  }
  return servicesValue;
}

/** 在应用根部包裹，使子组件可通过 useXxxService 获取 Service */
export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = getContextValue();
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
};

/** 内部 hook，供各 useXxxService 复用；必须在 ServicesProvider 内使用 */
function useServicesContext(): ServicesContextValue {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error('useServicesContext must be used within ServicesProvider');
  }
  return ctx;
}
