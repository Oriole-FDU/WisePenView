/**
 * 服务注册表：Service 依赖装配入口
 *
 * 统一形态：每个 *Services.impl.ts 均导出 createXxxServices(deps?): IXxxService 工厂函数
 *
 * 装配规则：
 * - 正式与 mock 共用此装配；API 由 @domain-apis 在构建时选择
 * - Level 1：依赖 Level 0，通过参数注入依赖后构建服务
 *
 * 为避免循环依赖与隐式耦合，service 间不得互相直接 import 实现，必须经此装配层
 * 新增更深层级（Level 2+）时在此文件延展，保持分层 + 显式注入依赖
 */
import { createAdminServices } from '@/domains/Admin/service/AdminServices.impl';
import { createAgentServices } from '@/domains/Agent/service/AgentServices.impl';
import { createAuthServices } from '@/domains/Auth/service/AuthServices.impl';
import { createChatServices } from '@/domains/Chat/service/ChatServices.impl';
import { createCourseServices } from '@/domains/Course/service/CourseServices.impl';
import { createDocumentServices } from '@/domains/Document/service/DocumentServices.impl';
import { createDriveServices } from '@/domains/Drive/service/DriveServices.impl';
import { createGroupServices } from '@/domains/Group/service/GroupServices.impl';
import { createImageServices } from '@/domains/Image/service/ImageServices.impl';
import { createInlineCommentServices } from '@/domains/InlineComment/service/InlineCommentServices.impl';
import { createInteractServices } from '@/domains/Interact/service/InteractServices.impl';
import { createMessageServices } from '@/domains/Message/service/MessageServices.impl';
import { createNoteServices } from '@/domains/Note/service/NoteServices.impl';
import { createQuotaServices } from '@/domains/Quota/service/QuotaServices.impl';
import { createResourcePermissionServices } from '@/domains/Resource/service/ResourcePermissionServices.impl';
import { createResourceServices } from '@/domains/Resource/service/ResourceServices.impl';
import { createSkillServices } from '@/domains/Skill/service/SkillServices.impl';
import { createSpeechServices } from '@/domains/Speech/service/SpeechServices.impl';
import { createTagServices } from '@/domains/Tag/service/TagServices.impl';
import { createUserServices } from '@/domains/User/service/UserServices.impl';
import { createWalletServices } from '@/domains/Wallet/service/WalletServices.impl';

import type { ServicesContextValue } from './registry.types';

// Level 0：无跨 service 依赖
const adminService = createAdminServices();
const agentService = createAgentServices();
const authService = createAuthServices();
const documentService = createDocumentServices();
const groupService = createGroupServices();
const imageService = createImageServices();
const inlineCommentService = createInlineCommentServices();
const interactService = createInteractServices();
const messageService = createMessageServices();
const quotaService = createQuotaServices();
const resourceService = createResourceServices();
const speechService = createSpeechServices();
const tagService = createTagServices();
const userService = createUserServices();
const walletService = createWalletServices();

// Level 1：依赖 Level 0
const noteService = createNoteServices({ resourceService: resourceService });
const skillService = createSkillServices({
  resourceService: resourceService,
});
const chatService = createChatServices({
  groupService: groupService,
  resourceService: resourceService,
});

const driveService = createDriveServices({
  tagService: tagService,
  resourceService: resourceService,
});
const courseService = createCourseServices({
  groupService: groupService,
  interactService: interactService,
  resourceService: resourceService,
  tagService: tagService,
});

// Level 2：在 Note、Skill 装配后组合权限概览，避免 Resource 与它们相互依赖。
const resourcePermissionService = createResourcePermissionServices({
  agentService,
  documentService,
  groupService,
  noteService,
  skillService,
  tagService,
});

const servicesValue: ServicesContextValue = {
  adminService: adminService,
  agentService: agentService,
  authService: authService,
  chatService: chatService,
  courseService: courseService,
  documentService: documentService,
  driveService: driveService,
  groupService: groupService,
  imageService: imageService,
  inlineCommentService: inlineCommentService,
  interactService: interactService,
  messageService: messageService,
  noteService: noteService,
  quotaService: quotaService,
  resourcePermissionService,
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
