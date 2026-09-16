import { coerceResourceActions, type ResourcePermissionOverview } from '@/domains/Resource';
import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

import {
  AssetResourceTypeEnum,
  type SkillAssetApiInfo,
  type SkillInfoApiResponse,
  type SkillVersionBundleApiResponse,
} from '../apis/SkillApi.type';
import type { SkillDetail, SkillFileNode, SkillSummary } from '../entity/skill';
import type { SkillVersionStatus } from '../enum';
import { SKILL_VERSION_STATUS } from '../enum';

const ROOT_PATH = '/';

function formatVersion(version: number): string {
  return `v${version}.0`;
}

function mapStatus(raw: string | undefined): SkillVersionStatus {
  if (raw === SKILL_VERSION_STATUS.PUBLISHED) return SKILL_VERSION_STATUS.PUBLISHED;
  return SKILL_VERSION_STATUS.DRAFT;
}

function resolveLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'py') return 'python';
  if (ext === 'json') return 'json';
  if (ext === 'yaml' || ext === 'yml') return 'yaml';
  if (ext === 'toml') return 'toml';
  if (ext === 'md') return 'markdown';
  return 'plaintext';
}

function normalizeDirectoryPath(path?: string): string {
  const trimmed = path?.trim();
  if (!trimmed || trimmed === ROOT_PATH) return ROOT_PATH;
  const withLeadingSlash = trimmed.startsWith(ROOT_PATH) ? trimmed : `${ROOT_PATH}${trimmed}`;
  return withLeadingSlash.endsWith(ROOT_PATH) ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function getOrCreateFolder(
  roots: SkillFileNode[],
  foldersByPath: Map<string, SkillFileNode>,
  folderPath: string
): SkillFileNode {
  const normalizedPath = normalizeDirectoryPath(folderPath);
  const existing = foldersByPath.get(normalizedPath);
  if (existing) return existing;

  const parentPath =
    normalizedPath.lastIndexOf(ROOT_PATH) <= 0
      ? ROOT_PATH
      : normalizedPath.slice(0, normalizedPath.lastIndexOf(ROOT_PATH));
  const folderName = normalizedPath.slice(normalizedPath.lastIndexOf(ROOT_PATH) + 1);
  const folderNode: SkillFileNode = {
    id: `folder:${normalizedPath}`,
    name: folderName,
    path: normalizedPath,
    kind: 'folder',
    children: [],
  };
  foldersByPath.set(normalizedPath, folderNode);

  if (parentPath === ROOT_PATH) {
    roots.push(folderNode);
  } else {
    const parent = getOrCreateFolder(roots, foldersByPath, parentPath);
    parent.children = [...(parent.children ?? []), folderNode];
  }

  return folderNode;
}

function assetToFileNode(asset: SkillAssetApiInfo): SkillFileNode {
  const name = asset.name ?? '';
  return {
    id: asset.id ?? `${normalizeDirectoryPath(asset.path)}:${name}`,
    name,
    path: normalizeDirectoryPath(asset.path),
    kind: 'file',
    language: resolveLanguage(name),
    objectKey: asset.objectKey,
    uploadStatus: asset.uploadStatus,
    size: normalizeNonNegativeNumber(asset.size),
  };
}

function sortSkillFiles(nodes: SkillFileNode[]): SkillFileNode[] {
  return [...nodes]
    .map((node) => (node.children ? { ...node, children: sortSkillFiles(node.children) } : node))
    .sort((a, b) => {
      if (a.name === 'SKILL.md') return -1;
      if (b.name === 'SKILL.md') return 1;
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function mapSkillFilesFromApi(bundle?: SkillVersionBundleApiResponse): SkillFileNode[] {
  const roots: SkillFileNode[] = [];
  const foldersByPath = new Map<string, SkillFileNode>();

  for (const asset of bundle?.assets ?? []) {
    const fileNode = assetToFileNode(asset);
    if (fileNode.path === ROOT_PATH) {
      roots.push(fileNode);
    } else {
      const folder = getOrCreateFolder(roots, foldersByPath, fileNode.path);
      folder.children = [...(folder.children ?? []), fileNode];
    }
  }

  return sortSkillFiles(roots);
}

function mapSkillDetail(params: {
  resourceId: string;
  info?: SkillInfoApiResponse;
  bundle?: SkillVersionBundleApiResponse;
}): SkillDetail {
  const resourceInfo = params.info?.resourceInfo;
  const skillInfo = params.info?.skillInfo;
  const version = skillInfo?.version ?? 0;
  const files = mapSkillFilesFromApi(params.bundle);
  const ownerId = resourceInfo?.ownerId ?? '';

  return {
    resourceId: params.resourceId,
    resourceInfo: resourceInfo
      ? ResourceServicesMap.mapResourceItemFromApi(resourceInfo)
      : undefined,
    title: resourceInfo?.resourceName ?? '',
    skillName: skillInfo?.name ?? '',
    description: skillInfo?.description ?? '',
    version,
    draftVersion: version + 1,
    status: mapStatus(params.bundle?.status),
    updatedAt: '',
    creatorId: ownerId,
    ownerId,
    currentActions: coerceResourceActions(resourceInfo?.currentActions),
    fileCount: files.length,
    files,
    scopeType: 'PERSONAL',
  };
}

function mapSkillSummary(item: {
  resourceId?: string;
  resourceName?: string;
  ownerId?: string;
  preview?: string;
}): SkillSummary {
  return {
    resourceId: item.resourceId ?? '',
    title: item.resourceName ?? '',
    skillName: '',
    description: item.preview?.trim() || '',
    version: 0,
    status: SKILL_VERSION_STATUS.DRAFT,
    updatedAt: '',
    creatorId: item.ownerId ?? '',
    scopeType: 'PERSONAL',
  };
}

function resolveAssetResourceType(name: string): AssetResourceTypeEnum {
  const ext = name.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, AssetResourceTypeEnum> = {
    md: AssetResourceTypeEnum.MD,
    py: AssetResourceTypeEnum.PYTHON_SCRIPT,
    txt: AssetResourceTypeEnum.TEXT,
    json: AssetResourceTypeEnum.JSON,
    yaml: AssetResourceTypeEnum.YAML,
    yml: AssetResourceTypeEnum.YAML,
    toml: AssetResourceTypeEnum.TOML,
  };
  return typeMap[ext ?? ''] ?? AssetResourceTypeEnum.TEXT;
}

const mapSkillPermissionOverviewFromApi = (
  info: SkillInfoApiResponse | null | undefined,
  resourceId: string
): ResourcePermissionOverview =>
  ResourceServicesMap.mapResourcePermissionOverviewFromApi(
    info?.resourceInfo ?? { resourceId, resourceName: '', ownerInfo: {} },
    resourceId
  );

export const SkillServicesMap = {
  formatVersion,
  mapSkillDetail,
  mapSkillPermissionOverviewFromApi,
  mapSkillSummary,
  mapSkillFilesFromApi,
  resolveAssetResourceType,
};
