import type { PageResult } from '@/domains/_shared/entity/page';

export interface UploadAttachmentParams {
  sessionId: string;
  file: File;
  saveToLibrary?: boolean;
}

export interface UploadAttachmentResult {
  attachmentId: string;
  filename?: string;
}

export interface IChatSessionService {
  createSession(params?: CreateSessionRequest): Promise<ChatSession>;
  setSessionAgent(params: SetSessionAgentRequest): Promise<ChatSession>;
  renameSession(params: RenameSessionRequest): Promise<ChatSession>;
  deleteSession(params: DeleteSessionRequest): Promise<void>;
  listSessions(params?: ListSessionsRequest): Promise<PageResult<ChatSession>>;
  uploadAttachment(params: UploadAttachmentParams): Promise<UploadAttachmentResult>;
}

export interface RenameSessionRequest {
  sessionId: string;
  newTitle?: string;
}

export interface CreateSessionRequest {
  title?: string;
  agentId?: string | null;
}

export interface SetSessionAgentRequest {
  sessionId: string;
  agentId?: string | null;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  agentId?: string | null;
  agentVersion?: number | null;
}

export interface DeleteSessionRequest {
  sessionId: string;
}

export interface ListSessionsRequest {
  page?: number;
  size?: number;
}
