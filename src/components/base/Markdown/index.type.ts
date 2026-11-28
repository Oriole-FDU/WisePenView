import type { MarkdownResourceResolver } from './Renderer';

export interface MarkdownContentProps {
  content: string;
  streaming?: boolean;
  linkMode?: 'external' | 'safe';
  resourceResolver?: MarkdownResourceResolver;
  onAnchorNavigate?: (hash: string) => void;
}
