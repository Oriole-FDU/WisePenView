import type { EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

export const RESOURCE_KIND = createEnum([
  { value: 'note', key: 'NOTE', label: '笔记' },
  { value: 'drawio', key: 'DRAWIO', label: 'DrawIO' },
  { value: 'file', key: 'FILE', label: '文件' },
  { value: 'skill', key: 'SKILL', label: '技能' },
  { value: 'agent', key: 'AGENT', label: '智能体' },
] as const);

export type ResourceKind = EnumValue<typeof RESOURCE_KIND>;

export const RESOURCE_VIEWER = createEnum([
  { value: 'office', key: 'OFFICE', label: 'Office' },
  { value: 'pdfPreview', key: 'PDF_PREVIEW', label: 'PDF 预览' },
  { value: 'note', key: 'NOTE', label: '笔记' },
  { value: 'drawio', key: 'DRAWIO', label: 'DrawIO' },
  { value: 'skill', key: 'SKILL', label: '技能' },
] as const);

export type ResourceViewer = EnumValue<typeof RESOURCE_VIEWER>;

export interface ResourceTarget {
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  viewer?: string;
}

export interface ResourceResolveParams {
  resourceType?: string;
  resourceName?: string;
}

export interface ResourceViewerResolveParams extends ResourceResolveParams {
  viewer?: string;
}

const DOCUMENT_EXTENSION_VALUES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'] as const;
const OFFICE_EXTENSION_VALUES = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'] as const;

type DocumentExtension = (typeof DOCUMENT_EXTENSION_VALUES)[number];
type OfficeExtension = (typeof OFFICE_EXTENSION_VALUES)[number];

const DOCUMENT_EXTENSIONS = new Set<string>(DOCUMENT_EXTENSION_VALUES);
const OFFICE_EXTENSIONS = new Set<string>(OFFICE_EXTENSION_VALUES);

const normalizeToken = (value?: string): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
};

const readExtension = (resourceName?: string): string | undefined => {
  const trimmed = resourceName?.trim();
  if (!trimmed) return undefined;
  const match = /\.([a-z0-9]+)$/i.exec(trimmed);
  return match?.[1]?.toLowerCase();
};

const isDocumentExtension = (value?: string): value is DocumentExtension =>
  value != null && DOCUMENT_EXTENSIONS.has(value);

const isOfficeExtension = (value?: string): value is OfficeExtension =>
  value != null && OFFICE_EXTENSIONS.has(value);

export const normalizeResourceKind = (resourceType?: string): ResourceKind | undefined => {
  const normalized = normalizeToken(resourceType);
  if (!normalized) return undefined;

  if (normalized === RESOURCE_KIND.NOTE) return RESOURCE_KIND.NOTE;
  if (normalized === RESOURCE_KIND.DRAWIO) return RESOURCE_KIND.DRAWIO;
  if (normalized === RESOURCE_KIND.FILE) return RESOURCE_KIND.FILE;
  if (normalized === RESOURCE_KIND.SKILL) return RESOURCE_KIND.SKILL;
  if (normalized === RESOURCE_KIND.AGENT) return RESOURCE_KIND.AGENT;

  if (isDocumentExtension(normalized)) return RESOURCE_KIND.FILE;

  return undefined;
};

export const resolveResourceKind = ({
  resourceType,
  resourceName,
}: ResourceResolveParams): ResourceKind => {
  const normalizedType = normalizeResourceKind(resourceType);
  if (normalizedType) return normalizedType;

  const extension = readExtension(resourceName);
  if (isDocumentExtension(extension)) return RESOURCE_KIND.FILE;

  return RESOURCE_KIND.FILE;
};

export const normalizeResourceViewer = (viewer?: string): ResourceViewer | undefined => {
  const normalized = normalizeToken(viewer);
  if (!normalized) return undefined;

  if (normalized === RESOURCE_VIEWER.OFFICE) return RESOURCE_VIEWER.OFFICE;
  if (
    normalized === 'pdf' ||
    normalized === 'pdfpreview' ||
    normalized === 'pdf-preview' ||
    normalized === 'pdf_preview'
  ) {
    return RESOURCE_VIEWER.PDF_PREVIEW;
  }
  if (normalized === RESOURCE_VIEWER.NOTE) return RESOURCE_VIEWER.NOTE;
  if (normalized === RESOURCE_VIEWER.DRAWIO) return RESOURCE_VIEWER.DRAWIO;
  if (normalized === RESOURCE_VIEWER.SKILL) return RESOURCE_VIEWER.SKILL;

  if (isOfficeExtension(normalized)) return RESOURCE_VIEWER.OFFICE;

  return undefined;
};

export const resolveResourceViewer = ({
  resourceType,
  resourceName,
  viewer,
}: ResourceViewerResolveParams): ResourceViewer | undefined => {
  const explicitViewer = normalizeResourceViewer(viewer);
  if (explicitViewer) return explicitViewer;

  const normalizedType = normalizeResourceKind(resourceType);
  if (normalizedType === RESOURCE_KIND.NOTE) return RESOURCE_VIEWER.NOTE;
  if (normalizedType === RESOURCE_KIND.DRAWIO) return RESOURCE_VIEWER.DRAWIO;
  if (normalizedType === RESOURCE_KIND.SKILL) return RESOURCE_VIEWER.SKILL;

  if (normalizedType !== RESOURCE_KIND.FILE) return undefined;

  const resourceTypeToken = normalizeToken(resourceType);
  const extension = isDocumentExtension(resourceTypeToken)
    ? resourceTypeToken
    : readExtension(resourceName);

  if (extension === 'pdf') return RESOURCE_VIEWER.PDF_PREVIEW;
  if (isOfficeExtension(extension)) return RESOURCE_VIEWER.OFFICE;

  return undefined;
};

export const isResourceViewerCompatible = (
  resourceType?: ResourceKind,
  viewer?: ResourceViewer
): boolean => {
  if (!resourceType) return false;
  if (!viewer) return resourceType === RESOURCE_KIND.FILE;

  if (resourceType === RESOURCE_KIND.NOTE) return viewer === RESOURCE_VIEWER.NOTE;
  if (resourceType === RESOURCE_KIND.DRAWIO) return viewer === RESOURCE_VIEWER.DRAWIO;
  if (resourceType === RESOURCE_KIND.SKILL) return viewer === RESOURCE_VIEWER.SKILL;
  if (resourceType === RESOURCE_KIND.FILE) {
    return viewer === RESOURCE_VIEWER.PDF_PREVIEW || viewer === RESOURCE_VIEWER.OFFICE;
  }

  return false;
};
