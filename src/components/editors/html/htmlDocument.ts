export const buildHtmlPageCsp = (assetOrigin: string): string =>
  [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    `style-src 'unsafe-inline' ${assetOrigin}`,
    'img-src data: blob:',
    "connect-src 'none'",
    "form-action 'none'",
    `base-uri ${assetOrigin}`,
  ].join('; ');

const escapeHtmlAttribute = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

const LINK_TAG_PATTERN = /<link\b[^>]*>/gi;
const STYLESHEET_REL_PATTERN =
  /\brel\s*=\s*(?:"[^"]*\bstylesheet\b[^"]*"|'[^']*\bstylesheet\b[^']*'|[^\s>]*\bstylesheet\b)/i;
const CROSS_ORIGIN_ATTRIBUTE_PATTERN = /\s+crossorigin(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/i;

/**
 * 沙箱 Blob 文档会以不透明来源发起 CORS 模式样式请求，后端无法为该来源返回
 * 匹配的允许头。样式来源仍由 CSP 限制，这里去掉样式表显式的 crossorigin，
 * 恢复浏览器默认的样式表加载模式。
 */
const normalizeStylesheetCrossOrigin = (source: string): string =>
  source.replace(LINK_TAG_PATTERN, (tag) =>
    STYLESHEET_REL_PATTERN.test(tag) ? tag.replace(CROSS_ORIGIN_ATTRIBUTE_PATTERN, '') : tag
  );

const buildHtmlMetadata = (assetOrigin: string): string =>
  [
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${buildHtmlPageCsp(assetOrigin)}">`,
    `<base href="${escapeHtmlAttribute(`${assetOrigin}/`)}">`,
  ].join('');

const HEAD_OPEN_PATTERN = /<head(?:\s[^>]*)?>/i;
const HTML_OPEN_PATTERN = /<html(?:\s[^>]*)?>/i;

/**
 * 为 Blob 文档补齐 charset、资源根地址与网络限制 CSP。
 * Blob URL 不能作为根路径的 base URL，必须显式注入 API origin，页面里的
 * `/singleHtmlPage/assets/...` 才能解析到后端资源。
 */
export const buildHtmlDocument = (source: string, assetBaseUrl: string): string => {
  const assetOrigin = new URL('/', assetBaseUrl).origin;
  const metadata = buildHtmlMetadata(assetOrigin);
  const normalizedSource = normalizeStylesheetCrossOrigin(source);
  const headMatch = normalizedSource.match(HEAD_OPEN_PATTERN);
  if (headMatch?.index != null) {
    const insertAt = headMatch.index + headMatch[0].length;
    return `${normalizedSource.slice(0, insertAt)}${metadata}${normalizedSource.slice(insertAt)}`;
  }

  const htmlMatch = normalizedSource.match(HTML_OPEN_PATTERN);
  if (htmlMatch?.index != null) {
    const insertAt = htmlMatch.index + htmlMatch[0].length;
    return `${normalizedSource.slice(0, insertAt)}<head>${metadata}</head>${normalizedSource.slice(insertAt)}`;
  }

  return `<!doctype html><html><head>${metadata}</head><body>${normalizedSource}</body></html>`;
};
