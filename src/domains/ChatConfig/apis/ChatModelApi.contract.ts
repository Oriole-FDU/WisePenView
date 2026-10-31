import { defineApiContract } from '@/apis/contract';
import { EmptyApiRequestSchema, EmptyApiResponseSchema } from '@/apis/schema';

import {
  BindModelProviderApiRequestSchema,
  CreateUserModelApiRequestSchema,
  CreateUserProviderApiRequestSchema,
  DeleteUserModelApiRequestSchema,
  DeleteUserProviderApiRequestSchema,
  ListAvailableModelsApiResponseSchema,
  ListModelsApiRequestSchema,
  ListModelsApiResponseSchema,
  ListUserProvidersApiResponseSchema,
  UnbindModelProviderApiRequestSchema,
  UpdateUserModelApiRequestSchema,
  UpdateUserProviderApiRequestSchema,
} from './ChatModelApi.schema';

export const ListAvailableModelsApiContract = defineApiContract({
  name: 'ListAvailableModelsApi',
  method: 'GET',
  endpoint: '/chat/model/listAvailableModels',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: ListAvailableModelsApiResponseSchema,
});

export const ListModelsApiContract = defineApiContract({
  name: 'ListModelsApi',
  method: 'GET',
  endpoint: '/chat/model/listModels',
  requestPlacement: 'query',
  transport: 'json',
  request: ListModelsApiRequestSchema,
  response: ListModelsApiResponseSchema,
});

export const ListUserProvidersApiContract = defineApiContract({
  name: 'ListUserProvidersApi',
  method: 'GET',
  endpoint: '/chat/model/listUserProviders',
  requestPlacement: 'none',
  transport: 'json',
  request: EmptyApiRequestSchema,
  response: ListUserProvidersApiResponseSchema,
});

export const CreateUserProviderApiContract = defineApiContract({
  name: 'CreateUserProviderApi',
  method: 'POST',
  endpoint: '/chat/model/createUserProvider',
  requestPlacement: 'body',
  transport: 'json',
  request: CreateUserProviderApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const UpdateUserProviderApiContract = defineApiContract({
  name: 'UpdateUserProviderApi',
  method: 'POST',
  endpoint: '/chat/model/updateUserProvider',
  requestPlacement: 'body',
  transport: 'json',
  request: UpdateUserProviderApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const DeleteUserProviderApiContract = defineApiContract({
  name: 'DeleteUserProviderApi',
  method: 'POST',
  endpoint: '/chat/model/deleteUserProvider',
  requestPlacement: 'body',
  transport: 'json',
  request: DeleteUserProviderApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const CreateUserModelApiContract = defineApiContract({
  name: 'CreateUserModelApi',
  method: 'POST',
  endpoint: '/chat/model/createUserModel',
  requestPlacement: 'body',
  transport: 'json',
  request: CreateUserModelApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const UpdateUserModelApiContract = defineApiContract({
  name: 'UpdateUserModelApi',
  method: 'POST',
  endpoint: '/chat/model/updateUserModel',
  requestPlacement: 'body',
  transport: 'json',
  request: UpdateUserModelApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const DeleteUserModelApiContract = defineApiContract({
  name: 'DeleteUserModelApi',
  method: 'POST',
  endpoint: '/chat/model/deleteUserModel',
  requestPlacement: 'body',
  transport: 'json',
  request: DeleteUserModelApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const BindModelProviderApiContract = defineApiContract({
  name: 'BindModelProviderApi',
  method: 'POST',
  endpoint: '/chat/model/bindModelProvider',
  requestPlacement: 'body',
  transport: 'json',
  request: BindModelProviderApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const UnbindModelProviderApiContract = defineApiContract({
  name: 'UnbindModelProviderApi',
  method: 'POST',
  endpoint: '/chat/model/unbindModelProvider',
  requestPlacement: 'body',
  transport: 'json',
  request: UnbindModelProviderApiRequestSchema,
  response: EmptyApiResponseSchema,
});
