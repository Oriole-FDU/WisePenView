import { executeApiContract } from '@/apis/executeApiContract';

import {
  BindModelProviderApiContract,
  CreateUserModelApiContract,
  CreateUserProviderApiContract,
  DeleteUserModelApiContract,
  DeleteUserProviderApiContract,
  ListAvailableModelsApiContract,
  ListModelsApiContract,
  ListUserProvidersApiContract,
  UnbindModelProviderApiContract,
  UpdateUserModelApiContract,
  UpdateUserProviderApiContract,
} from './ChatModelApi.contract';
import type {
  BindModelProviderApiRequest,
  CreateUserModelApiRequest,
  CreateUserProviderApiRequest,
  DeleteUserModelApiRequest,
  DeleteUserProviderApiRequest,
  ListAvailableModelsApiResponse,
  ListModelsApiRequest,
  ListModelsApiResponse,
  ListUserProvidersApiResponse,
  UnbindModelProviderApiRequest,
  UpdateUserModelApiRequest,
  UpdateUserProviderApiRequest,
} from './ChatModelApi.schema';
import {
  DeleteUserToolConfigApiContract,
  ListToolsApiContract,
  UpdateUserToolConfigApiContract,
} from './ChatToolApi.contract';
import type {
  DeleteUserToolConfigApiRequest,
  ListToolsApiResponse,
  ToolApiResponse,
  UpdateUserToolConfigApiRequest,
} from './ChatToolApi.schema';

function listAvailableModels(): Promise<ListAvailableModelsApiResponse> {
  return executeApiContract(ListAvailableModelsApiContract, undefined);
}

function listModels(request: ListModelsApiRequest): Promise<ListModelsApiResponse> {
  return executeApiContract(ListModelsApiContract, request);
}

function listTools(): Promise<ListToolsApiResponse> {
  return executeApiContract(ListToolsApiContract, undefined);
}

function listUserProviders(): Promise<ListUserProvidersApiResponse> {
  return executeApiContract(ListUserProvidersApiContract, undefined);
}

async function createUserProvider(request: CreateUserProviderApiRequest): Promise<void> {
  await executeApiContract(CreateUserProviderApiContract, request);
}

async function updateUserProvider(request: UpdateUserProviderApiRequest): Promise<void> {
  await executeApiContract(UpdateUserProviderApiContract, request);
}

async function deleteUserProvider(request: DeleteUserProviderApiRequest): Promise<void> {
  await executeApiContract(DeleteUserProviderApiContract, request);
}

async function createUserModel(request: CreateUserModelApiRequest): Promise<void> {
  await executeApiContract(CreateUserModelApiContract, request);
}

async function updateUserModel(request: UpdateUserModelApiRequest): Promise<void> {
  await executeApiContract(UpdateUserModelApiContract, request);
}

async function deleteUserModel(request: DeleteUserModelApiRequest): Promise<void> {
  await executeApiContract(DeleteUserModelApiContract, request);
}

async function bindModelProvider(request: BindModelProviderApiRequest): Promise<void> {
  await executeApiContract(BindModelProviderApiContract, request);
}

async function unbindModelProvider(request: UnbindModelProviderApiRequest): Promise<void> {
  await executeApiContract(UnbindModelProviderApiContract, request);
}

function updateUserToolConfig(request: UpdateUserToolConfigApiRequest): Promise<ToolApiResponse> {
  return executeApiContract(UpdateUserToolConfigApiContract, request);
}

async function deleteUserToolConfig(request: DeleteUserToolConfigApiRequest): Promise<void> {
  await executeApiContract(DeleteUserToolConfigApiContract, request);
}

export const ChatConfigApi = {
  listAvailableModels,
  listModels,
  listTools,
  listUserProviders,
  createUserProvider,
  updateUserProvider,
  deleteUserProvider,
  createUserModel,
  updateUserModel,
  deleteUserModel,
  bindModelProvider,
  unbindModelProvider,
  updateUserToolConfig,
  deleteUserToolConfig,
};
