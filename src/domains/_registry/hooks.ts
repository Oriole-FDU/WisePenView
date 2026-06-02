import { use } from 'react';

import type { IAdminService } from '@/domains/Admin';
import type { IAuthService } from '@/domains/Auth';
import type { IChatService } from '@/domains/Chat';
import type { IDocumentService } from '@/domains/Document';
import type { IDriveService } from '@/domains/Drive';
import type { IGroupService } from '@/domains/Group';
import type { IImageService } from '@/domains/Image';
import type { INoteService } from '@/domains/Note';
import type { IQuotaService } from '@/domains/Quota';
import type { IResourceService } from '@/domains/Resource';
import type { ISkillService } from '@/domains/Skill';
import type { IStickerService } from '@/domains/Sticker';
import type { ITagService } from '@/domains/Tag';
import type { IUserService } from '@/domains/User';
import type { IWalletService } from '@/domains/Wallet';

import { ServicesContext } from './context';
import type { ServicesContextValue } from './registry';

/** 内部 hook，供 useXxxService 复用；必须在 ServicesProvider 内使用 */
function useServicesContext(): ServicesContextValue {
  const ctx = use(ServicesContext);
  if (!ctx) {
    throw new Error('useServicesContext must be used within ServicesProvider');
  }
  return ctx;
}

export const useAdminService = (): IAdminService => useServicesContext().adminService;
export const useAuthService = (): IAuthService => useServicesContext().authService;
export const useChatService = (): IChatService => useServicesContext().chatService;
export const useDocumentService = (): IDocumentService => useServicesContext().documentService;
export const useDriveService = (): IDriveService => useServicesContext().driveService;
export const useGroupService = (): IGroupService => useServicesContext().groupService;
export const useImageService = (): IImageService => useServicesContext().imageService;
export const useNoteService = (): INoteService => useServicesContext().noteService;
export const useQuotaService = (): IQuotaService => useServicesContext().quotaService;
export const useResourceService = (): IResourceService => useServicesContext().resourceService;
export const useStickerService = (): IStickerService => useServicesContext().stickerService;
export const useTagService = (): ITagService => useServicesContext().tagService;
export const useUserService = (): IUserService => useServicesContext().userService;
/** 个人中心钱包、高级组 token 相关页注入 */
export const useWalletService = (): IWalletService => useServicesContext().walletService;
export const useSkillService = (): ISkillService => useServicesContext().skillService;
