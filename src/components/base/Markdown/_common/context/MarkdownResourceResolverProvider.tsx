import type { ReactNode } from 'react';

import {
  type MarkdownResourceResolver,
  MarkdownResourceResolverContext,
} from './MarkdownResourceResolverContext';

export function MarkdownResourceResolverProvider({
  children,
  value,
}: {
  children: ReactNode;
  value?: MarkdownResourceResolver;
}) {
  return (
    <MarkdownResourceResolverContext.Provider value={value}>
      {children}
    </MarkdownResourceResolverContext.Provider>
  );
}
