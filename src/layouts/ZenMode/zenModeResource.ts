import type { DriveNode } from '@/domains/Drive';
import {
  RESOURCE_KIND,
  RESOURCE_VIEWER,
  normalizeResourceKind,
  type ResourceTarget,
} from '@/utils/navigation/resourceTarget';

const ZEN_DOCUMENT_TYPE_TOKENS = new Set([
  RESOURCE_KIND.FILE,
  'document',
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
]);

const readDocumentExtension = (resourceName?: string): string | undefined => {
  const match = /\.([a-z0-9]+)$/i.exec(resourceName?.trim() ?? '');
  return match?.[1]?.toLowerCase();
};

export const normalizeZenModeTarget = (target?: ResourceTarget): ResourceTarget | undefined => {
  if (!target?.resourceId) return undefined;
  const normalizedType = normalizeResourceKind(target.resourceType);
  if (normalizedType === RESOURCE_KIND.NOTE) {
    return {
      ...target,
      resourceType: RESOURCE_KIND.NOTE,
      viewer: RESOURCE_VIEWER.NOTE,
    };
  }
  if (normalizedType && normalizedType !== RESOURCE_KIND.FILE) return undefined;

  const typeToken = target.resourceType?.trim().toLowerCase();
  const extension = readDocumentExtension(target.resourceName);
  if (
    !ZEN_DOCUMENT_TYPE_TOKENS.has(typeToken ?? '') &&
    !ZEN_DOCUMENT_TYPE_TOKENS.has(extension ?? '')
  ) {
    return undefined;
  }

  return {
    ...target,
    resourceType: RESOURCE_KIND.FILE,
    viewer: RESOURCE_VIEWER.PDF_PREVIEW,
  };
};

export const isZenModeNodeSelectable = (node: DriveNode): boolean => {
  if (node.type !== 'resource' && node.type !== 'link') return false;
  return (
    normalizeZenModeTarget({
      resourceId: node.resourceId,
      resourceType: node.resourceType,
      resourceName: node.title,
    }) != null
  );
};
