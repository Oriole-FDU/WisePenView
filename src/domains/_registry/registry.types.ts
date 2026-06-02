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

export interface ServicesContextValue {
  adminService: IAdminService;
  authService: IAuthService;
  chatService: IChatService;
  documentService: IDocumentService;
  driveService: IDriveService;
  groupService: IGroupService;
  imageService: IImageService;
  noteService: INoteService;
  quotaService: IQuotaService;
  resourceService: IResourceService;
  stickerService: IStickerService;
  tagService: ITagService;
  userService: IUserService;
  walletService: IWalletService;
  skillService: ISkillService;
}
