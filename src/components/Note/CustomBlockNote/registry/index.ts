import type { BlockSpecs, ExtensionFactoryInstance } from '@blocknote/core';
import { BlockNoteSchema } from '@blocknote/core';
import type { EditorProps } from '@tiptap/pm/view';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
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

const createRegistryError = (reason: string) =>
  createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, { reason });

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
      throw createRegistryError(`Note 插件依赖存在环：${item.id}`);
    }
    visiting.add(item.id);
    for (const dependencyId of item.dependencies ?? []) {
      if (!availableIds.has(dependencyId)) {
        throw createRegistryError(`Note 插件 ${item.id} 缺少依赖：${dependencyId}`);
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
      throw createRegistryError(`Note 插件 id 重复：${item.id}`);
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
      ['Markdown 导入', plugin.capabilities.markdownImport, plugin.markdownImport],
      ['Markdown 导出', plugin.capabilities.markdownExport, plugin.markdownExport],
      ['AI Diff', plugin.capabilities.aiDiff, plugin.aiDiff],
      ['纯文本', plugin.capabilities.plainText, plugin.plainText],
      ['查找替换', plugin.capabilities.findReplace, plugin.findReplace],
      ['打印', plugin.capabilities.print, plugin.print],
    ] as const;
    for (const [name, declaration, implementation] of executableCapabilities) {
      const needsImplementation =
        declaration.support === 'custom' || declaration.support === 'inherited';
      if (needsImplementation && !implementation) {
        throw createRegistryError(
          `Note 插件 ${plugin.id} 的 ${name}：声明为 ${declaration.support}，但未提供实现`
        );
      }
      if (!needsImplementation && implementation) {
        throw createRegistryError(`Note 插件 ${plugin.id} 提供了 ${name} 实现，但未声明为 custom`);
      }
    }

    const owners = plugin.kind === 'block' ? blockPlugins : inlinePlugins;
    const currentOwner = owners.get(plugin.type);
    if (currentOwner) {
      throw createRegistryError(
        `Note ${plugin.kind} type ${plugin.type} 存在多个 owner：${currentOwner.id}、${plugin.id}`
      );
    }
    owners.set(plugin.type, plugin as never);
    if (plugin.kind === 'block' && plugin.insertion?.default) {
      if (defaultBlock) {
        throw createRegistryError(`Note 默认插入 block 存在多个 owner：${plugin.id}`);
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
    throw createRegistryError('Note registry 缺少默认插入 block owner');
  }
  const block = registry.defaultBlock.createEmpty();
  if (block.type !== 'paragraph') {
    throw createRegistryError('Note 默认插入 block 必须是 paragraph');
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
        throw createRegistryError(
          `Note editorProps.${String(key)} 存在多个 owner：${previousContributor}、${contributor?.id ?? 'unknown'}`
        );
      }
      seenScalarKeys.set(String(key), contributor?.id ?? 'unknown');
      (merged as Record<string, unknown>)[key] = value;
    }
  });

  const mergedDomHandlers = mergeHandleDOMEvents(domHandlersList);
  if (mergedDomHandlers) merged.handleDOMEvents = mergedDomHandlers;
  return merged;
}
