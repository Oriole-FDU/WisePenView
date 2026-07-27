/**
 * PDF Viewer 功能开关配置
 *
 * true = 启用（默认），false = 禁用
 * 禁用父级会连带禁用所有子级（如禁用 'annotation' 则高亮、下划线等均不可用）
 *
 * @see https://www.embedpdf.com/docs/react/viewer/customizing-ui
 */
const PDF_FEATURE_CONFIG: Record<string, boolean> = {
  // zoom
  zoom: true,

  // insert
  insert: false,

  // annotation markup
  annotation: false,
  'annotation-shape': false,

  // form
  form: false,

  // redaction
  redaction: false,

  // document actions
  'document-open': false,
  'document-close': false,
  'document-print': false,
  'document-capture': true,
  'document-export': false,
  'document-fullscreen': true,
  'document-protect': false,

  // page
  page: true,

  // panel
  panel: true,
  'panel-comment': true,

  // tools
  tools: false,

  // selection
  selection: false,
  'selection-copy': false,

  // history
  history: false,
};

const getDisabledCategories = (): string[] =>
  Object.entries(PDF_FEATURE_CONFIG)
    .filter(([, enabled]) => !enabled)
    .map(([category]) => category);

export const DEFAULT_PDF_VIEWER_CONFIG: Record<string, unknown> = {
  tabBar: 'never',
  documentManager: { maxDocuments: 5 },
  disabledCategories: getDisabledCategories(),
};
