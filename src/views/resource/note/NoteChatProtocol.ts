import type { NoteSelectionSnapshot, NoteSessionStatus, SelectedNoteScope } from '@/domains/Note';
import { RESOURCE_KIND, RESOURCE_VIEWER } from '@/domains/Resource/model/resourceTarget';
import type { FrontendStateEntry, SelectedNoteScopeValue } from '@/frontendState';
import i18n from '@/i18n';
import {
  createResourceChatProviderKey,
  type ResourceChatContext,
  type ResourceChatProvider,
} from '@/layouts/Resource/_context/resourceChatModel';

const NOTE_EDITOR_SKILL_ID = 'builtin:current-note-editor';

function createNoteChatResource(resourceId: string) {
  return {
    resourceId,
    resourceType: RESOURCE_KIND.NOTE,
    viewer: RESOURCE_VIEWER.NOTE,
  } as const;
}

function mapSelectedNoteScope(scope: SelectedNoteScope): SelectedNoteScopeValue {
  if (scope.type === 'blocks') {
    return {
      type: 'blocks',
      block_ids: scope.blockIds,
      ...(scope.includeChildren === undefined ? {} : { include_children: scope.includeChildren }),
    };
  }
  if (scope.type === 'subtree') {
    return { type: 'subtree', root_block_id: scope.rootBlockId };
  }
  return {
    type: 'block_range',
    start_block_id: scope.startBlockId,
    end_block_id: scope.endBlockId,
    ...(scope.includePartial === undefined ? {} : { include_partial: scope.includePartial }),
  };
}

export function createNoteChatStateProvider(params: {
  resourceId: string;
  syncStatus: NoteSessionStatus;
  isClientContentSignaturePending?: boolean;
}): ResourceChatProvider {
  const resource = createNoteChatResource(params.resourceId);

  return {
    key: createResourceChatProviderKey(resource),
    getBlockedReason: () => {
      if (params.syncStatus !== 'connected') {
        return i18n.t('ai.blockedByConnection', { ns: 'note' });
      }
      if (params.isClientContentSignaturePending) {
        return i18n.t('ai.blockedBySync', { ns: 'note' });
      }
      return undefined;
    },
    onDemandSkillIds: [NOTE_EDITOR_SKILL_ID],
  };
}

export function createNoteSelectionChatContext(
  resourceId: string,
  selection: NoteSelectionSnapshot
): { context: ResourceChatContext; entries: FrontendStateEntry[] } {
  const resource = createNoteChatResource(resourceId);
  const selectedText = selection.text.trim();
  const entries: FrontendStateEntry[] = [
    { key: 'selected_text', value: selectedText },
    ...(selection.scope
      ? [{ key: 'selected_note_scope', value: mapSelectedNoteScope(selection.scope) } as const]
      : []),
  ];

  return { context: { providerKey: createResourceChatProviderKey(resource) }, entries };
}
