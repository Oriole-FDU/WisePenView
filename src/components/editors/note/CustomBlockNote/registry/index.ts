import type { BlockSpecs, ExtensionFactoryInstance } from '@blocknote/core';
import { BlockNoteSchema } from '@blocknote/core';
import type { EditorProps } from '@tiptap/pm/view';

import { createDomainError, FRONTEND_DOMAIN_ERROR } from '@/utils/error';

import type {
  NoteBlockPlugin,
  NoteContentPlugin,
  NoteEditorExtension,
  NoteEditorServices,
  NoteInlineContentSpecs,
  NoteInlinePlugin,
  NotePluginBundle,
  NotePluginNode,
  NotePluginRegistry,
} from './types';

export interface CreateNotePluginRegistryOptions {
  root: NotePluginBundle;
  editorExtensions?: readonly NoteEditorExtension[];
  services: NoteEditorServices;
}

type DOMEventHandlers = NonNullable<EditorProps['handleDOMEvents']>;
type DOMEventName = keyof DOMEventHandlers;
type DOMEventHandler = NonNullable<DOMEventHandlers[DOMEventName]>;

function flattenPluginTree(root: NotePluginBundle): NotePluginNode[] {
  const nodes: NotePluginNode[] = [];
  const visit = (node: NotePluginNode) => {
    nodes.push(node);
    if (node.kind === 'bundle') {
      node.children.forEach(visit);
    }
  };
  visit(root);
  return nodes;
}

function sortByDependencies<T extends { id: string; dependencies?: readonly string[] }>(
  items: readonly T[],
  availableIds: ReadonlySet<string>
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const sorted: T[] = [];

  const visit = (item: T) => {
    if (visited.has(item.id)) return;
    if (visiting.has(item.id)) {
      throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
    }
    visiting.add(item.id);
    for (const dependencyId of item.dependencies ?? []) {
      if (!availableIds.has(dependencyId)) {
        throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
      }
      const dependency = byId.get(dependencyId);
      if (dependency) visit(dependency);
    }
    visiting.delete(item.id);
    visited.add(item.id);
    sorted.push(item);
  };

  items.forEach(visit);
  return sorted;
}

export function createNotePluginRegistry(
  options: CreateNotePluginRegistryOptions
): NotePluginRegistry {
  const { root, editorExtensions = [], services } = options;
  const nodes = flattenPluginTree(root);
  const allItems = [...nodes, ...editorExtensions];
  const seenIds = new Set<string>();
  for (const item of allItems) {
    if (seenIds.has(item.id)) {
      throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
    }
    seenIds.add(item.id);
  }

  const contentPlugins = nodes.filter(
    (node): node is NoteContentPlugin => node.kind === 'block' || node.kind === 'inline'
  );
  const sortedContentPlugins = sortByDependencies(contentPlugins, seenIds);
  const sortedEditorExtensions = sortByDependencies(editorExtensions, seenIds);
  const blockPlugins = new Map<string, NoteBlockPlugin>();
  const inlinePlugins = new Map<string, NoteInlinePlugin>();
  let defaultBlock: NotePluginRegistry['defaultBlock'];

  for (const plugin of sortedContentPlugins) {
    const executableCapabilities = [
      [plugin.capabilities.markdownImport, plugin.markdownImport],
      [plugin.capabilities.markdownExport, plugin.markdownExport],
      [plugin.capabilities.aiDiff, plugin.aiDiff],
      [plugin.capabilities.plainText, plugin.plainText],
      [plugin.capabilities.findReplace, plugin.findReplace],
      [plugin.capabilities.print, plugin.print],
    ] as const;
    for (const [declaration, implementation] of executableCapabilities) {
      const needsImplementation =
        declaration.support === 'custom' || declaration.support === 'inherited';
      if (needsImplementation && !implementation) {
        throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
      }
      if (!needsImplementation && implementation) {
        throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
      }
    }

    const owners = plugin.kind === 'block' ? blockPlugins : inlinePlugins;
    const currentOwner = owners.get(plugin.type);
    if (currentOwner) {
      throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
    }
    owners.set(plugin.type, plugin as never);
    if (plugin.kind === 'block' && plugin.insertion?.default) {
      if (defaultBlock) {
        throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
      }
      defaultBlock = plugin.insertion;
    }
  }

  return {
    root,
    services,
    contentPlugins: sortedContentPlugins,
    blockPlugins,
    inlinePlugins,
    defaultBlock,
    editorExtensions: sortedEditorExtensions,
  };
}

export function createDefaultNoteBlock(registry: NotePluginRegistry): Record<string, unknown> {
  if (!registry.defaultBlock) {
    throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
  }
  const block = registry.defaultBlock.createEmpty();
  if (block.type !== 'paragraph') {
    throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
  }
  return block;
}

export function createNoteBlockNoteSchema(registry: NotePluginRegistry) {
  const blockSpecs: BlockSpecs = {};
  const inlineContentSpecs: NoteInlineContentSpecs = {};

  for (const plugin of registry.contentPlugins) {
    if (plugin.kind === 'block') {
      blockSpecs[plugin.type] = plugin.spec;
    } else {
      inlineContentSpecs[plugin.type] = plugin.spec;
    }
  }

  return BlockNoteSchema.create().extend({
    blockSpecs,
    inlineContentSpecs,
  });
}

export function collectNoteEditorExtensions(
  registry: NotePluginRegistry
): ExtensionFactoryInstance[] {
  return [...registry.contentPlugins, ...registry.editorExtensions].flatMap(
    (plugin) => plugin.extensions?.({ registry, services: registry.services }) ?? []
  );
}

export function collectNotePrintStyles(registry: NotePluginRegistry): string {
  const styles = new Set<string>();
  for (const plugin of [...registry.contentPlugins, ...registry.editorExtensions]) {
    for (const style of plugin.print?.styles ?? []) {
      const normalized = style.trim();
      if (normalized) styles.add(normalized);
    }
  }
  return [...styles].join('\n');
}

function mergeHandleDOMEvents(
  handlersList: readonly DOMEventHandlers[]
): DOMEventHandlers | undefined {
  if (handlersList.length === 0) return undefined;

  const grouped = new Map<DOMEventName, DOMEventHandler[]>();
  for (const handlers of handlersList) {
    for (const name of Object.keys(handlers) as DOMEventName[]) {
      const handler = handlers[name];
      if (!handler) continue;
      const list = grouped.get(name);
      if (list) list.push(handler);
      else grouped.set(name, [handler]);
    }
  }

  const merged: DOMEventHandlers = {};
  for (const [name, handlers] of grouped) {
    const composed: DOMEventHandler = (view, event) => {
      for (const handler of handlers) {
        if (handler(view, event) === true) return true;
      }
      return false;
    };
    (merged as Record<string, DOMEventHandler>)[name] = composed;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function collectNoteEditorProps(registry: NotePluginRegistry): Partial<EditorProps> {
  const contributors = [...registry.contentPlugins, ...registry.editorExtensions];
  const domHandlersList: DOMEventHandlers[] = [];
  const merged: Partial<EditorProps> = {};
  const seenScalarKeys = new Map<string, string>();

  contributors.forEach((contributor) => {
    const props = contributor.editorProps?.({ registry, services: registry.services });
    if (!props) return;
    for (const key of Object.keys(props) as Array<keyof EditorProps>) {
      const value = props[key];
      if (value === undefined) continue;
      if (key === 'handleDOMEvents') {
        domHandlersList.push(value as DOMEventHandlers);
        continue;
      }
      const previousContributor = seenScalarKeys.get(String(key));
      if (previousContributor) {
        throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
      }
      seenScalarKeys.set(String(key), contributor?.id ?? 'unknown');
      (merged as Record<string, unknown>)[key] = value;
    }
  });

  const mergedDomHandlers = mergeHandleDOMEvents(domHandlersList);
  if (mergedDomHandlers) merged.handleDOMEvents = mergedDomHandlers;
  return merged;
}
