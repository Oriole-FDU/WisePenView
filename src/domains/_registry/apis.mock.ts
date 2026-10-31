/** 构建期选择 API 实现；service 与 mapper 始终共用。 */
export { createOssClient, putOssPresignedUrl } from '@/domains/_shared/mock/ossClient.mock';
export { AdminMessageApi } from '@/domains/Admin/mock/AdminMessageApi.mock';
export { AdminUserApi } from '@/domains/Admin/mock/AdminUserApi.mock';
export { AgentApi } from '@/domains/Agent/mock/AgentApi.mock';
export { AuthApi } from '@/domains/Auth/mock/AuthApi.mock';
export { ChatConfigApi } from '@/domains/ChatConfig/mock/ChatConfigApi.mock';
export { ChatSessionApi } from '@/domains/ChatSession/mock/ChatSessionApi.mock';
export {
  reconnectChatStream,
  streamChatCompletion,
  streamChatRecovery,
} from '@/domains/ChatTurn/mock/ChatStreamApi.mock';
export { ChatTurnApi } from '@/domains/ChatTurn/mock/ChatTurnApi.mock';
export { DocumentApi } from '@/domains/Document/mock/DocumentApi.mock';
export { GroupApi, GroupMemberApi, GroupResConfigApi } from '@/domains/Group/mock/GroupApi.mock';
export { HtmlPageApi } from '@/domains/HtmlPage/mock/HtmlPageApi.mock';
export { ImageApi } from '@/domains/Image/mock/ImageApi.mock';
export { InlineCommentApi } from '@/domains/InlineComment/mock/InlineCommentApi.mock';
export { MessageApi } from '@/domains/Message/mock/MessageApi.mock';
export { NoteApi } from '@/domains/Note/mock/NoteApi.mock';
export { ResourceItemApi } from '@/domains/Resource/mock/ResourceApi.mock';
export { ResourcePlacementApi } from '@/domains/Resource/mock/ResourcePlacementApi.mock';
export { CommentApi } from '@/domains/ResourceComment/mock/CommentApi.mock';
export { FavoriteApi } from '@/domains/ResourceFavorite/mock/FavoriteApi.mock';
export { ResourceInteractionApi } from '@/domains/ResourceInteraction/mock/ResourceInteractionApi.mock';
export { SkillApi } from '@/domains/Skill/mock/SkillApi.mock';
export { SpeechApi } from '@/domains/Speech/mock/SpeechApi.mock';
export { TagApi } from '@/domains/Tag/mock/TagApi.mock';
export { UserApi } from '@/domains/User/mock/UserApi.mock';
export { UserTaskApi } from '@/domains/User/mock/UserTaskApi.mock';
export { UserTourApi } from '@/domains/User/mock/UserTourApi.mock';
export { WalletApi } from '@/domains/Wallet/mock/WalletApi.mock';
