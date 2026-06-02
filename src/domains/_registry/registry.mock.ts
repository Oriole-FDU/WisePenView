/**
 * Mock 服务注册表：仅绑定 *Services.mock.ts
 */
import { AdminServicesMock } from '@/domains/Admin/mock/AdminServices.mock';
import { AuthServicesMock } from '@/domains/Auth/mock/AuthServices.mock';
import { ChatServicesMock } from '@/domains/Chat/mock/ChatServices.mock';
import { DocumentServicesMock } from '@/domains/Document/mock/DocumentServices.mock';
import { DriveServicesMock } from '@/domains/Drive/mock/DriveServices.mock';
import { GroupServicesMock } from '@/domains/Group/mock/GroupServices.mock';
import { ImageServicesMock } from '@/domains/Image/mock/ImageServices.mock';
import { NoteServicesMock } from '@/domains/Note/mock/NoteServices.mock';
import { QuotaServicesMock } from '@/domains/Quota/mock/QuotaServices.mock';
import { ResourceServicesMock } from '@/domains/Resource/mock/ResourceServices.mock';
import { SkillServicesMock } from '@/domains/Skill/mock/SkillServices.mock';
import { StickerServicesMock } from '@/domains/Sticker/mock/StickerServices.mock';
import { TagServicesMock } from '@/domains/Tag/mock/TagServices.mock';
import { UserServicesMock } from '@/domains/User/mock/UserServices.mock';
import { WalletServicesMock } from '@/domains/Wallet/mock/WalletServices.mock';

import type { ServicesContextValue } from './registry.types';

const mockServicesValue: ServicesContextValue = {
  adminService: AdminServicesMock,
  authService: AuthServicesMock,
  chatService: ChatServicesMock,
  documentService: DocumentServicesMock,
  driveService: DriveServicesMock,
  groupService: GroupServicesMock,
  imageService: ImageServicesMock,
  noteService: NoteServicesMock,
  quotaService: QuotaServicesMock,
  resourceService: ResourceServicesMock,
  stickerService: StickerServicesMock,
  tagService: TagServicesMock,
  userService: UserServicesMock,
  walletService: WalletServicesMock,
  skillService: SkillServicesMock,
};

export function getContextValue(): ServicesContextValue {
  return mockServicesValue;
}
