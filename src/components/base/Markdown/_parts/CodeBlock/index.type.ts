import type { ReactNode } from 'react';

export interface CodeBlockFrameProps {
  code: string;
  language?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export interface CodeBlockProps {
  code: string;
  language?: string;
  actions?: ReactNode;
}

export interface HighlightedCodeProps {
  code: string;
  language?: string;
}
