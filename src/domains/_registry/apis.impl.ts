/** 构建期选择 API 实现；service 与 mapper 始终共用。 */
export { createOssClient } from '@/domains/_shared/apis/ossClient';
export { putOssPresignedUrl } from '@/domains/_shared/apis/ossPresignedPut';
export { AdminUserApi } from '@/domains/Admin/apis/AdminUserApi';
export { AgentApi } from '@/domains/Agent/apis/AgentApi';
export { AuthApi } from '@/domains/Auth/apis/AuthApi';
export { ChatConfigApi } from '@/domains/ChatConfig/apis/ChatConfigApi';
export { ChatSessionApi } from '@/domains/ChatSession/apis/ChatSessionApi';
export {
  reconnectChatStream,
  streamChatCompletion,
  streamChatRecovery,
} from '@/domains/ChatTurn/apis/ChatStreamApi';
export { ChatTurnApi } from '@/domains/ChatTurn/apis/ChatTurnApi';
export { DocumentApi } from '@/domains/Document/apis/DocumentApi';
export { GroupApi, GroupMemberApi, GroupResConfigApi } from '@/domains/Group/apis/GroupApi';
export { HtmlPageApi } from '@/domains/HtmlPage/apis/HtmlPageApi';
export { ImageApi } from '@/domains/Image/apis/ImageApi';
export { InlineCommentApi } from '@/domains/InlineComment/apis/InlineCommentApi';
export { MessageApi } from '@/domains/Message/apis/MessageApi';
export { NoteApi } from '@/domains/Note/apis/NoteApi';
export { ResourceItemApi } from '@/domains/Resource/apis/ResourceApi';
export { ResourcePlacementApi } from '@/domains/Resource/apis/ResourcePlacementApi';
export { CommentApi } from '@/domains/ResourceComment/apis/CommentApi';
export { FavoriteApi } from '@/domains/ResourceFavorite/apis/FavoriteApi';
export { ResourceInteractionApi } from '@/domains/ResourceInteraction/apis/ResourceInteractionApi';
export { SkillApi } from '@/domains/Skill/apis/SkillApi';
export { SpeechApi } from '@/domains/Speech/apis/SpeechApi';
export { TagApi } from '@/domains/Tag/apis/TagApi';
export { UserApi } from '@/domains/User/apis/UserApi';
export { UserTaskApi } from '@/domains/UserTask/apis/UserTaskApi';
export { UserTourApi } from '@/domains/UserTour/apis/UserTourApi';
export { UserVerificationApi } from '@/domains/UserVerification/apis/UserVerificationApi';
export { WalletApi } from '@/domains/Wallet/apis/WalletApi';
