import { useContext } from 'react';

import { MarkdownResourceResolverContext } from './MarkdownResourceResolverContext';

export function useMarkdownResourceResolver() {
  return useContext(MarkdownResourceResolverContext);
}
