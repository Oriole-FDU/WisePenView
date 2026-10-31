import { defineApiContract } from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  ChatSessionApiSchema,
  CreateSessionApiRequestSchema,
  DeleteSessionApiRequestSchema,
  InitTemporaryAttachmentUploadApiRequestSchema,
  InitTemporaryAttachmentUploadApiResponseSchema,
  ListHistoryMessagesApiRequestSchema,
  ListHistoryMessagesApiResponseSchema,
  ListSessionsApiRequestSchema,
  ListSessionsApiResponseSchema,
  RenameSessionApiRequestSchema,
  SetSessionAgentApiRequestSchema,
} from './ChatSessionApi.schema';

export const CreateSessionApiContract = defineApiContract({
  name: 'CreateSessionApi',
  method: 'POST',
  endpoint: '/chat/session/createSession',
  requestPlacement: 'body',
  transport: 'json',
  request: CreateSessionApiRequestSchema,
  response: ChatSessionApiSchema,
});

export const SetSessionAgentApiContract = defineApiContract({
  name: 'SetSessionAgentApi',
  method: 'POST',
  endpoint: '/chat/session/setSessionAgent',
  requestPlacement: 'body',
  queryKeys: ['session_id'],
  transport: 'json',
  request: SetSessionAgentApiRequestSchema,
  response: ChatSessionApiSchema,
});

export const RenameSessionApiContract = defineApiContract({
  name: 'RenameSessionApi',
  method: 'POST',
  endpoint: '/chat/session/renameSession',
  requestPlacement: 'body',
  queryKeys: ['session_id'],
  transport: 'json',
  request: RenameSessionApiRequestSchema,
  response: ChatSessionApiSchema,
});

export const DeleteSessionApiContract = defineApiContract({
  name: 'DeleteSessionApi',
  method: 'POST',
  endpoint: '/chat/session/deleteSession',
  requestPlacement: 'query',
  transport: 'json',
  request: DeleteSessionApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ListSessionsApiContract = defineApiContract({
  name: 'ListSessionsApi',
  method: 'GET',
  endpoint: '/chat/session/listSessions',
  requestPlacement: 'query',
  transport: 'json',
  request: ListSessionsApiRequestSchema,
  response: ListSessionsApiResponseSchema,
});

export const ListHistoryMessagesApiContract = defineApiContract({
  name: 'ListHistoryMessagesApi',
  method: 'GET',
  endpoint: '/chat/session/listHistoryMessages',
  requestPlacement: 'query',
  transport: 'json',
  request: ListHistoryMessagesApiRequestSchema,
  response: ListHistoryMessagesApiResponseSchema,
});

export const InitTemporaryAttachmentUploadApiContract = defineApiContract({
  name: 'InitTemporaryAttachmentUploadApi',
  method: 'POST',
  endpoint: '/chat/attachment/initUploadTemporaryAttachment',
  requestPlacement: 'body',
  transport: 'json',
  request: InitTemporaryAttachmentUploadApiRequestSchema,
  response: InitTemporaryAttachmentUploadApiResponseSchema,
});
