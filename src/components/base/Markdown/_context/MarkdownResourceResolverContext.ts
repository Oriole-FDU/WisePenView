import { createContext } from 'react';

export interface MarkdownResourceResolver {
  /** 返回 undefined 时保留 Markdown 的默认 URL 处理；null 会阻止渲染该资源。 */
  resolveUrl?: (url: string, kind: 'link' | 'image') => string | null | undefined;
  /** 返回 true 时由调用方接管链接跳转。 */
  onLinkClick?: (url: string) => boolean;
}

export const MarkdownResourceResolverContext = createContext<MarkdownResourceResolver | undefined>(
  undefined
);
