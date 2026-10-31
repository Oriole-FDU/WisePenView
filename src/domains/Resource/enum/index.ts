import type { EnumValue } from '@/utils/type/enum';
import { defineEnum } from '@/utils/type/enum';

/** 排序字段枚举 */
export const RESOURCE_SORT_BY = defineEnum(['UPDATE_TIME', 'CREATE_TIME', 'NAME', 'SIZE'] as const);

/** 排序方向枚举 */
export const RESOURCE_SORT_DIR = defineEnum(['ASC', 'DESC'] as const);

/** 标签查询逻辑：OR=包含任意标签，AND=包含全部标签 */
export const TAG_QUERY_LOGIC_MODE = defineEnum(['OR', 'AND'] as const);

/** 全文搜索范围：与后端 SearchScope 枚举字面值一致 */
export const SEARCH_SCOPE = defineEnum(['ALL', 'DOCUMENT', 'NOTE'] as const);

/** 全文搜索可命中的资源细分类型：仅文档类 + 笔记（Skill/Agent 属 AI 资产，不进搜索）；小写值对齐后端 extension */
const SEARCH_RESOURCE_TYPE = defineEnum({
  NOTE: 'note',
  DRAWIO: 'drawio',
  PDF: 'pdf',
  DOC: 'doc',
  DOCX: 'docx',
  PPT: 'ppt',
  PPTX: 'pptx',
  XLS: 'xls',
  XLSX: 'xlsx',
  UNKNOWN: 'unknown',
} as const);

export type TagQueryLogicMode = EnumValue<typeof TAG_QUERY_LOGIC_MODE>;
export type SearchScope = EnumValue<typeof SEARCH_SCOPE>;
export type SearchResourceType = EnumValue<typeof SEARCH_RESOURCE_TYPE>;

/** 后端 resourceType 大小写不敏感，统一归一化为小写枚举值，未知归 'unknown' */
export const normalizeSearchResourceType = (raw: string): SearchResourceType => {
  const lower = raw.trim().toLowerCase();
  return SEARCH_RESOURCE_TYPE.isValue(lower) ? lower : SEARCH_RESOURCE_TYPE.UNKNOWN;
};

export type ResourceSortBy = EnumValue<typeof RESOURCE_SORT_BY>;
export type ResourceSortDir = EnumValue<typeof RESOURCE_SORT_DIR>;
