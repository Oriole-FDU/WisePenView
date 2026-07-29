/**
 * 真实服务注册表：Service 依赖装配入口
 *
 * 统一形态：每个 *Services.impl.ts 均导出 createXxxServices(deps?): IXxxService 工厂函数
 *
 * 装配规则：
 * - Level 0：无跨 service 依赖，工厂无参数
 * - Level 1：依赖 Level 0，通过参数注入依赖后构建服务
 *
 * 为避免循环依赖与隐式耦合，service 间不得互相直接 import 实现，必须经此装配层
 * 新增更深层级（Level 2+）时在此文件延展，保持分层 + 显式注入依赖
 */
import { createAdminServices } from '@/domains/Admin/service/AdminServices.impl';
import { createAgentServices } from '@/domains/Agent/service/AgentServices.impl';
import { createAuthServices } from '@/domains/Auth/service/AuthServices.impl';
import { createChatServices } from '@/domains/Chat/service/ChatServices.impl';
import { createDocumentServices } from '@/domains/Document/service/DocumentServices.impl';
import { createDriveServices } from '@/domains/Drive/service/DriveServices.impl';
import { createGroupServices } from '@/domains/Group/service/GroupServices.impl';
import { createImageServices } from '@/domains/Image/service/ImageServices.impl';
import { createInlineCommentServices } from '@/domains/InlineComment/service/InlineCommentServices.impl';
import { createInteractServices } from '@/domains/Interact/service/InteractServices.impl';
import { createNoteServices } from '@/domains/Note/service/NoteServices.impl';
import { createQuotaServices } from '@/domains/Quota/service/QuotaServices.impl';
import { createResourceServices } from '@/domains/Resource/service/ResourceServices.impl';
import { createSkillServices } from '@/domains/Skill/service/SkillServices.impl';
import { createSpeechServices } from '@/domains/Speech/service/SpeechServices.impl';
import { createTagServices } from '@/domains/Tag/service/TagServices.impl';
import { createUserServices } from '@/domains/User/service/UserServices.impl';
import { createWalletServices } from '@/domains/Wallet/service/WalletServices.impl';

import type { ServicesContextValue } from './registry.types';

// Level 0：无跨 service 依赖
const adminService = createAdminServices();
const authService = createAuthServices();
const documentService = createDocumentServices();
const groupService = createGroupServices();
const imageService = createImageServices();
const inlineCommentService = createInlineCommentServices();
const interactService = createInteractServices();
const quotaService = createQuotaServices();
const speechService = createSpeechServices();
const userService = createUserServices();
const walletService = createWalletServices();

// Level 1：依赖 Level 0
const resourceService = createResourceServices({
  groupService: groupService,
  userService: userService,
});
const agentService = createAgentServices({ userService: userService });

// Level 2：依赖已装配的领域服务
const noteService = createNoteServices({ resourceService: resourceService });
const skillService = createSkillServices({
  resourceService: resourceService,
  userService: userService,
});
const tagService = createTagServices({ resourceService: resourceService });
const chatService = createChatServices({
  groupService: groupService,
  resourceService: resourceService,
});

// Level 3：依赖 Level 2 标签服务
const driveService = createDriveServices({
  tagService: tagService,
  resourceService: resourceService,
});

const servicesValue: ServicesContextValue = {
  adminService: adminService,
  agentService: agentService,
  authService: authService,
  chatService: chatService,
  documentService: documentService,
  driveService: driveService,
  groupService: groupService,
  imageService: imageService,
  inlineCommentService: inlineCommentService,
  interactService: interactService,
  noteService: noteService,
  quotaService: quotaService,
  resourceService: resourceService,
  skillService: skillService,
  speechService: speechService,
  tagService: tagService,
  userService: userService,
  walletService: walletService,
};

export function getContextValue(): ServicesContextValue {
  return servicesValue;
}
