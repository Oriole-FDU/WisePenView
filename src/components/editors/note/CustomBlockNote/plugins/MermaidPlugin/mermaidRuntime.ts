import i18n from '@/i18n';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { MERMAID_SOURCE_MAX_LENGTH, renderMermaidDiagram } from '@/utils/mermaid';

export async function renderNoteMermaidDiagram(id: string, source: string): Promise<string> {
  if (source.length > MERMAID_SOURCE_MAX_LENGTH) {
    const error = createClientError(FRONTEND_CLIENT_ERROR.VALIDATION);
    error.message = i18n.t('mermaid.sourceTooLong', {
      ns: 'note',
      maxLength: MERMAID_SOURCE_MAX_LENGTH.toLocaleString(),
    });
    throw error;
  }

  return renderMermaidDiagram(id, source);
}
