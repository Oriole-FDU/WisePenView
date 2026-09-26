import { isRecord } from '@/utils/type/typeGuards';
/** Slash Menu 新建 Mermaid 图表时使用的可直接渲染示例。 */
export const DEFAULT_MERMAID_SOURCE = 'flowchart TD\n  A[开始] --> B[结束]';

export const MERMAID_TEMPLATE_SOURCES = {
  flowchart:
    'flowchart TD\n  A[接收需求] --> B{信息是否完整}\n  B -->|是| C[生成方案]\n  B -->|否| D[补充上下文]\n  D --> A\n  C --> E[交付结果]',
  sequence:
    'sequenceDiagram\n  participant 用户\n  participant 前端\n  participant 服务端\n  用户->>前端: 发起请求\n  前端->>服务端: 提交参数\n  服务端-->>前端: 返回结果\n  前端-->>用户: 展示反馈',
  gantt:
    'gantt\n  title 项目计划\n  dateFormat  YYYY-MM-DD\n  section 准备\n  需求梳理 :a1, 2026-08-01, 3d\n  方案确认 :after a1, 2d\n  section 交付\n  开发实现 :2026-08-06, 5d\n  验证发布 :after a1, 3d',
  state:
    'stateDiagram-v2\n  [*] --> 草稿\n  草稿 --> 审阅中: 提交\n  审阅中 --> 已通过: 通过\n  审阅中 --> 草稿: 修改\n  已通过 --> [*]',
  class:
    'classDiagram\n  class NoteEditor {\n    +string resourceId\n    +save()\n    +exportMarkdown()\n  }\n  class MermaidBlock {\n    +string source\n    +render()\n  }\n  NoteEditor --> MermaidBlock',
  er: 'erDiagram\n  USER ||--o{ NOTE : owns\n  NOTE ||--o{ BLOCK : contains\n  BLOCK ||--o| MERMAID_DIAGRAM : renders\n  USER {\n    string id\n    string name\n  }\n  NOTE {\n    string id\n    string title\n  }',
  pie: 'pie showData\n  title 任务占比\n  "需求" : 30\n  "开发" : 45\n  "验证" : 25',
  timeline:
    'timeline\n  title 版本节奏\n  2026-08-01 : 梳理方案\n  2026-08-05 : 完成实现\n  2026-08-08 : 验证发布',
  journey:
    'journey\n  title 用户使用图表块\n  section 创建\n    插入 Mermaid 块: 5: 用户\n    选择模板: 4: 用户\n  section 编辑\n    修改源码: 4: 用户\n    查看图形: 5: 用户',
} as const;

export type MermaidTemplateKey = keyof typeof MERMAID_TEMPLATE_SOURCES;

/** BlockNote 代码内容只取文本节点，图表 DSL 不承载行内格式。 */
export function readMermaidSource(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter(isRecord)
    .map((inline) => (typeof inline.text === 'string' ? inline.text : ''))
    .join('');
}
