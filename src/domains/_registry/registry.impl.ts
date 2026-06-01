/**
 * 真实服务注册表：Service 依赖装配入口
 *
 * 统一形态：每个 *Services.impl.ts 均导�?createXxxServices(deps?): IXxxService 工厂�?
 *
 * 装配规则�?
 * - Level 0：无�?service 依赖，工厂无参�?
 * - Level 1：依�?Level 0，通过参数注入依赖后构建�?
 *
 * 为避免循环依赖与隐式耦合，service 间不得互相直�?import 实现，必须经此装配�?
 * 新增更深层级（Level 2+）时在此文件延展，保�?分层 + 显式注入"�?
 */
import { createAdminServices } from '@/domains/Admin/service/AdminServices.impl';
import { createAuthServices } from '@/domains/Auth/service/AuthServices.impl';
import { createChatServices } from '@/domains/Chat/service/ChatServices.impl';
import { createDocumentServices } from '@/domains/Document/service/DocumentServices.impl';
import { createDriveServices } from '@/domains/Drive/service/DriveServices.impl';
import { createGroupServices } from '@/domains/Group/service/GroupServices.impl';
import { createImageServices } from '@/domains/Image/service/ImageServices.impl';
import { createNoteServices } from '@/domains/Note/service/NoteServices.impl';
import { createQuotaServices } from '@/domains/Quota/service/QuotaServices.impl';
import { createResourceServices } from '@/domains/Resource/service/ResourceServices.impl';
import { createStickerServices } from '@/domains/Sticker/service/StickerServices.impl';
import { createTagServices } from '@/domains/Tag/service/TagServices.impl';
import { createUserServices } from '@/domains/User/service/UserServices.impl';
import { createWalletServices } from '@/domains/Wallet/service/WalletServices.impl';
import { createSkillServices } from '@/domains/Skill/service/SkillServices.impl';

import type { ServicesContextValue } from './registry.types';

// Level 0：无跨 service 依赖
const adminService = createAdminServices();
const authService = createAuthServices();
const chatService = createChatServices();
const documentService = createDocumentServices();
const groupService = createGroupServices();
const imageService = createImageServices();
const noteService = createNoteServices();
const quotaService = createQuotaServices();
const resourceService = createResourceServices();
const userService = createUserServices();
const walletService = createWalletServices();
const skillService = createSkillServices();

// Level 1：依�?Level 0
const tagService = createTagServices({ resourceService: resourceService });
const stickerService = createStickerServices({ resourceService: resourceService });
const driveService = createDriveServices({
  tagService: tagService,
  resourceService: resourceService,
});

const servicesValue: ServicesContextValue = {
  adminService: adminService,
  authService: authService,
  chatService: chatService,
  documentService: documentService,
  driveService: driveService,
  groupService: groupService,
  imageService: imageService,
  noteService: noteService,
  quotaService: quotaService,
  resourceService: resourceService,
  stickerService: stickerService,
  tagService: tagService,
  userService: userService,
  walletService: walletService,
  skillService: skillService,
};

export function getContextValue(): ServicesContextValue {
  return servicesValue;
}
