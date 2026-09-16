/** 全文搜索 mock 语料 + 查询模拟，对齐后端 SearchQueryServiceImpl */
import type {
  GlobalSearchApiRequest,
  GlobalSearchApiResponse,
  GlobalSearchItemApiResponse,
  ResourceItemApiResponse,
} from '../apis/ResourceApi.type';

/** 一篇可被搜索的 mock 资源；content 仅 mock 内部用，后端不返回 */
interface SearchCorpusItem {
  resourceId: string;
  /** 小写资源类型，与后端 ResourceType 序列化值一致。 */
  resourceType: string;
  resourceName: string;
  content: string;
  updateTime: string;
}

/** 15 篇文档 + 8 篇笔记，覆盖 pdf/doc/docx/ppt/pptx/xls/xlsx/note */
export const SEARCH_CORPUS: SearchCorpusItem[] = [
  {
    resourceId: 'doc-ds-analysis',
    resourceType: 'pdf',
    resourceName: '数据结构与算法分析.pdf',
    content:
      '本书系统讲解线性表、栈、队列、树与图等数据结构，并深入剖析排序与查找算法的时间复杂度。重点章节包括二叉搜索树、平衡树与最短路径算法。',
    updateTime: '2026-05-14T09:20:00',
  },
  {
    resourceId: 'doc-cn-topdown',
    resourceType: 'pdf',
    resourceName: '计算机网络：自顶向下方法.pdf',
    content:
      '从应用层出发讲解 HTTP、DNS 与 TCP/IP 协议栈，覆盖可靠数据传输、拥塞控制与网络安全基础，配有大量协议交互示例。',
    updateTime: '2026-05-10T15:42:00',
  },
  {
    resourceId: 'doc-os-concepts',
    resourceType: 'pdf',
    resourceName: '操作系统概念.pdf',
    content:
      '介绍进程与线程调度、虚拟内存管理、文件系统与死锁处理，并结合系统调用说明内核态与用户态的边界，附带常见调度算法的对比数据。',
    updateTime: '2026-04-28T11:05:00',
  },
  {
    resourceId: 'doc-se-report',
    resourceType: 'docx',
    resourceName: '软件工程课程设计报告.docx',
    content:
      '本报告记录了项目的需求分析、系统设计与测试过程，采用微服务架构，重点描述了搜索模块的设计与实现思路。',
    updateTime: '2026-05-15T20:10:00',
  },
  {
    resourceId: 'doc-thesis',
    resourceType: 'docx',
    resourceName: '毕业论文初稿.docx',
    content:
      '论文研究基于 Elasticsearch 的全文搜索系统，探讨倒排索引、分词器选择与查询性能优化，并给出实验对比数据。',
    updateTime: '2026-05-13T08:30:00',
  },
  {
    resourceId: 'doc-ml-intro',
    resourceType: 'pptx',
    resourceName: '机器学习导论.pptx',
    content:
      '课程幻灯片涵盖监督学习、无监督学习与神经网络基础，配有线性回归与梯度下降的推导示例与对应训练数据。',
    updateTime: '2026-05-02T14:00:00',
  },
  {
    resourceId: 'doc-defense',
    resourceType: 'pptx',
    resourceName: '项目结题答辩.pptx',
    content:
      '答辩材料展示了项目整体架构、核心功能演示与性能测试结果，并总结了团队协作经验与后续优化方向。',
    updateTime: '2026-05-16T10:15:00',
  },
  {
    resourceId: 'doc-exp-data',
    resourceType: 'xlsx',
    resourceName: '实验数据统计表.xlsx',
    content: '表格汇总了三组对照实验的测试数据，包含响应时间、吞吐量与错误率等指标的统计结果。',
    updateTime: '2026-05-11T16:48:00',
  },
  {
    resourceId: 'doc-grades',
    resourceType: 'xlsx',
    resourceName: '课程成绩汇总.xlsx',
    content: '记录本学期各门课程的平时成绩与期末成绩，并自动计算加权平均分与排名。',
    updateTime: '2026-04-20T09:00:00',
  },
  {
    resourceId: 'doc-csapp',
    resourceType: 'pdf',
    resourceName: '深入理解计算机系统.pdf',
    content:
      '从程序员视角讲解数据的机器级表示、汇编、处理器体系结构与存储器层次，强调系统级编程能力的培养。',
    updateTime: '2026-03-30T13:20:00',
  },
  {
    resourceId: 'doc-distributed',
    resourceType: 'pdf',
    resourceName: '分布式系统原理.pdf',
    content:
      '讲解分布式系统中的一致性、共识算法、数据复制与分区容错，分析 CAP 定理对系统设计的约束。',
    updateTime: '2026-05-08T17:30:00',
  },
  {
    resourceId: 'doc-weekly-tpl',
    resourceType: 'docx',
    resourceName: '周报模板.docx',
    content: '团队周报模板，包含本周完成事项、遇到的问题与下周计划三个部分，便于项目进度跟踪。',
    updateTime: '2026-05-12T19:00:00',
  },
  {
    resourceId: 'doc-lab-report-tpl',
    resourceType: 'doc',
    resourceName: '实验报告模板.doc',
    content:
      '实验报告模板，采用 Word 97-2003 格式以兼容老旧打印系统，依次包含实验目的、原理、步骤、数据与结论五个部分。',
    updateTime: '2026-04-18T10:00:00',
  },
  {
    resourceId: 'doc-defense-tpl',
    resourceType: 'ppt',
    resourceName: '答辩模板.ppt',
    content:
      'PPT 模板适配毕业答辩与课程展示场景，预设封面、目录、研究背景、方法、实验数据与致谢页，整体采用蓝白配色。',
    updateTime: '2026-04-22T14:30:00',
  },
  {
    resourceId: 'doc-lab-devices',
    resourceType: 'xls',
    resourceName: '实验室设备清单.xls',
    content:
      '按编号记录实验室各类仪器的型号、采购时间与负责人，附设备使用数据，便于学期初的设备盘点与日常维护登记。',
    updateTime: '2026-03-26T15:40:00',
  },
  {
    resourceId: 'note-search-design',
    resourceType: 'note',
    resourceName: '全文搜索功能设计笔记',
    content:
      '搜索模块基于 Elasticsearch 实现，需要支持文档名称、正文与标签的加权检索，并对命中内容做高亮，ACL 过滤要与资源列表保持一致。',
    updateTime: '2026-05-16T08:05:00',
  },
  {
    resourceId: 'note-es-study',
    resourceType: 'note',
    resourceName: 'Elasticsearch 学习笔记',
    content:
      '记录倒排索引原理、IK 分词器 ik_max_word 与 ik_smart 的区别，以及 multi_match 查询与字段加权在搜索中的用法。',
    updateTime: '2026-05-09T21:15:00',
  },
  {
    resourceId: 'note-ds-review',
    resourceType: 'note',
    resourceName: '数据结构复习笔记',
    content: '复习链表、树与哈希表的常见操作，整理了排序算法的稳定性对比与图的遍历模板。',
    updateTime: '2026-05-07T22:40:00',
  },
  {
    resourceId: 'note-meeting',
    resourceType: 'note',
    resourceName: '项目周会记录',
    content:
      '本次周会确认了搜索功能的前端联调计划，分配了 mock 数据与接口对齐的任务，并讨论了测试用例的覆盖范围。',
    updateTime: '2026-05-15T18:30:00',
  },
  {
    resourceId: 'note-mythical',
    resourceType: 'note',
    resourceName: '读书笔记：人月神话',
    content:
      '记录关于软件工程中人力与进度关系的思考：向进度落后的项目盲目增加人手，只会让它更加落后。',
    updateTime: '2026-04-25T20:00:00',
  },
  {
    resourceId: 'note-algo-template',
    resourceType: 'note',
    resourceName: '算法竞赛模板',
    content: '收集了动态规划、并查集与最短路径等常用算法模板，附带复杂度分析与边界处理的注意事项。',
    updateTime: '2026-05-04T12:10:00',
  },
  {
    resourceId: 'note-net-study',
    resourceType: 'note',
    resourceName: '网络协议学习笔记',
    content: '梳理 TCP 三次握手、四次挥手与滑动窗口机制，对比 UDP 的无连接特性与各自的适用场景。',
    updateTime: '2026-05-06T10:50:00',
  },
  {
    resourceId: 'note-search-opt',
    resourceType: 'note',
    resourceName: '随手记：搜索优化思路',
    content:
      '记录几个搜索性能优化想法：结果缓存、查询防抖、分页懒加载，以及如何评估高亮片段的可读性。',
    updateTime: '2026-05-16T07:20:00',
  },
];

/** 高亮标签，与后端 SearchConstants.HIGHLIGHT_PRE_TAG / POST_TAG 对齐 */
const HIGHLIGHT_PRE = '<em class="wp-highlight">';
const HIGHLIGHT_POST = '</em>';
const SNIPPET_WINDOW = 32;
const MAX_SNIPPET_FRAGMENTS = 2;

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text: string, keyword: string): string {
  if (keyword === '') return text;
  const re = new RegExp(escapeRegExp(keyword), 'gi');
  return text.replace(re, (matched) => `${HIGHLIGHT_PRE}${matched}${HIGHLIGHT_POST}`);
}

/** 取关键词上下文摘要并高亮；正文未命中返回 null（对齐后端「仅标题命中时 highlightContent 为 null」） */
function buildContentSnippet(content: string, keyword: string): string | null {
  const lowerContent = content.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  if (lowerKeyword === '' || !lowerContent.includes(lowerKeyword)) return null;

  const fragments: string[] = [];
  let cursor = 0;
  while (fragments.length < MAX_SNIPPET_FRAGMENTS) {
    const hitIndex = lowerContent.indexOf(lowerKeyword, cursor);
    if (hitIndex === -1) break;
    const start = Math.max(0, hitIndex - SNIPPET_WINDOW);
    const end = Math.min(content.length, hitIndex + lowerKeyword.length + SNIPPET_WINDOW);
    let fragment = content.slice(start, end);
    if (start > 0) fragment = `…${fragment}`;
    if (end < content.length) fragment = `${fragment}…`;
    fragments.push(highlight(fragment, keyword));
    cursor = hitIndex + lowerKeyword.length;
  }
  return fragments.join(' ');
}

function emptyPage(page: number, size: number): GlobalSearchApiResponse {
  return { list: [], total: 0, page, size, totalPage: 0 };
}

/** 对齐后端流程：scope 过滤 → 标题/正文匹配 → 相关性排序（resourceName^3 加权）→ 分页 */
export function simulateGlobalSearch(
  params: GlobalSearchApiRequest,
  resources: ReadonlyMap<string, ResourceItemApiResponse>
): GlobalSearchApiResponse {
  const { page, size, scope } = params;
  const keyword = params.keyword.trim();
  if (keyword === '') return emptyPage(page, size);
  const lowerKeyword = keyword.toLowerCase();

  const scoped = SEARCH_CORPUS.flatMap((item) => {
    const resource = resources.get(item.resourceId);
    return resource ? [{ ...item, resourceName: resource.resourceName }] : [];
  }).filter((item) => {
    if (scope === 'DOCUMENT') return item.resourceType !== 'note';
    if (scope === 'NOTE') return item.resourceType === 'note';
    return true;
  });

  const ranked = scoped
    .map((item) => {
      const nameHit = item.resourceName.toLowerCase().includes(lowerKeyword);
      const contentSnippet = buildContentSnippet(item.content, keyword);
      if (!nameHit && contentSnippet === null) return null;
      const hit: GlobalSearchItemApiResponse = {
        resourceId: item.resourceId,
        resourceType: item.resourceType,
        resourceName: highlight(item.resourceName, keyword),
        highlightContent: contentSnippet,
        updateTime: item.updateTime,
      };
      const score = (nameHit ? 3 : 0) + (contentSnippet !== null ? 1 : 0);
      return { hit, score };
    })
    .filter((entry): entry is { hit: GlobalSearchItemApiResponse; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score);

  const total = ranked.length;
  if (total === 0) return emptyPage(page, size);
  const totalPage = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size;
  const list = ranked.slice(start, start + size).map((entry) => entry.hit);
  return { list, total, page, size, totalPage };
}
