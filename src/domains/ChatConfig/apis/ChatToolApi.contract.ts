import { defineApiContract } from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema } from '@/apis/schema';

import {
  DeleteUserToolConfigApiRequestSchema,
  ListToolsApiResponseSchema,
  ToolApiSchema,
  UpdateUserToolConfigApiRequestSchema,
} from './ChatToolApi.schema';

export const ListToolsApiContract = defineApiContract({
  name: 'ListToolsApi',
  method: 'GET',
  endpoint: '/chat/tool/listUserTools',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: ListToolsApiResponseSchema,
});

export const UpdateUserToolConfigApiContract = defineApiContract({
  name: 'UpdateUserToolConfigApi',
  method: 'POST',
  endpoint: '/chat/tool/updateUserToolConfig',
  requestPlacement: 'body',
  transport: 'json',
  request: UpdateUserToolConfigApiRequestSchema,
  response: ToolApiSchema,
});

export const DeleteUserToolConfigApiContract = defineApiContract({
  name: 'DeleteUserToolConfigApi',
  method: 'POST',
  endpoint: '/chat/tool/deleteUserToolConfig',
  requestPlacement: 'body',
  transport: 'json',
  request: DeleteUserToolConfigApiRequestSchema,
  response: EmptyApiResponseSchema,
});
