import type { EnumValue } from '@/utils/type/enum';
import { createEnum } from '@/utils/type/enum';

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
  { value: 'agent', key: 'AGENT', label: '智能体' },
] as const);

export type ResourceViewer = EnumValue<typeof RESOURCE_VIEWER>;

export interface ResourceTarget {
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  viewer?: string;
}

export interface ResourceViewerResolveParams {
  resourceType?: string;
  viewer?: string;
}

const DOCUMENT_RESOURCE_TYPE_VALUES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'] as const;
const OFFICE_RESOURCE_TYPE_VALUES = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'] as const;

type DocumentResourceType = (typeof DOCUMENT_RESOURCE_TYPE_VALUES)[number];
type OfficeResourceType = (typeof OFFICE_RESOURCE_TYPE_VALUES)[number];

const DOCUMENT_RESOURCE_TYPES = new Set<string>(DOCUMENT_RESOURCE_TYPE_VALUES);
const OFFICE_RESOURCE_TYPES = new Set<string>(OFFICE_RESOURCE_TYPE_VALUES);

const normalizeToken = (value?: string): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
};

const isDocumentResourceType = (value?: string): value is DocumentResourceType =>
  value != null && DOCUMENT_RESOURCE_TYPES.has(value);

export const isOfficeResourceType = (value?: string): value is OfficeResourceType =>
  value != null && OFFICE_RESOURCE_TYPES.has(normalizeToken(value) ?? '');

export const normalizeResourceKind = (resourceType?: string): ResourceKind | undefined => {
  const normalized = normalizeToken(resourceType);
  if (!normalized) return undefined;

  if (normalized === RESOURCE_KIND.NOTE) return RESOURCE_KIND.NOTE;
  if (normalized === RESOURCE_KIND.DRAWIO) return RESOURCE_KIND.DRAWIO;
  if (normalized === RESOURCE_KIND.FILE) return RESOURCE_KIND.FILE;
  if (normalized === RESOURCE_KIND.SKILL) return RESOURCE_KIND.SKILL;
  if (normalized === RESOURCE_KIND.AGENT) return RESOURCE_KIND.AGENT;

  if (isDocumentResourceType(normalized)) return RESOURCE_KIND.FILE;

  return undefined;
};

export const resolveResourceKind = (resourceType?: string): ResourceKind => {
  const normalizedType = normalizeResourceKind(resourceType);
  if (normalizedType) return normalizedType;
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
  if (normalized === RESOURCE_VIEWER.AGENT) return RESOURCE_VIEWER.AGENT;

  if (isOfficeResourceType(normalized)) return RESOURCE_VIEWER.OFFICE;

  return undefined;
};

export const resolveResourceViewer = ({
  resourceType,
  viewer,
}: ResourceViewerResolveParams): ResourceViewer | undefined => {
  const explicitViewer = normalizeResourceViewer(viewer);
  if (explicitViewer) return explicitViewer;

  const normalizedType = normalizeResourceKind(resourceType);
  if (normalizedType === RESOURCE_KIND.NOTE) return RESOURCE_VIEWER.NOTE;
  if (normalizedType === RESOURCE_KIND.DRAWIO) return RESOURCE_VIEWER.DRAWIO;
  if (normalizedType === RESOURCE_KIND.SKILL) return RESOURCE_VIEWER.SKILL;
  if (normalizedType === RESOURCE_KIND.AGENT) return RESOURCE_VIEWER.AGENT;

  if (normalizedType !== RESOURCE_KIND.FILE) return undefined;

  const resourceTypeToken = normalizeToken(resourceType);

  if (resourceTypeToken === 'pdf') return RESOURCE_VIEWER.PDF_PREVIEW;
  if (isOfficeResourceType(resourceTypeToken)) return RESOURCE_VIEWER.OFFICE;

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
  if (resourceType === RESOURCE_KIND.AGENT) return viewer === RESOURCE_VIEWER.AGENT;
  if (resourceType === RESOURCE_KIND.FILE) {
    return viewer === RESOURCE_VIEWER.PDF_PREVIEW || viewer === RESOURCE_VIEWER.OFFICE;
  }

  return false;
};
