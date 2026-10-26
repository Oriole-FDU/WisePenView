import type { ReactNode } from 'react';

import type { EditorResourcePresentation } from '@/components/editors/editor.type';

export interface ResourceLayoutProps {
  children: ReactNode;
  className?: string;
  header?: { resource?: EditorResourcePresentation } | false;
  /** 顶栏右侧扩展动作，由工作区装配，资源布局本身不感知其语义。 */
  headerTrailingActions?: ReactNode;
}
