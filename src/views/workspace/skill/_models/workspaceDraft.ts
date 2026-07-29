import type { SkillDetail, SkillFileNode, UploadSkillAssetResult } from '@/domains/Skill';

import {
  findFile,
  getFirstFile,
  isLocalAssetId,
  remapTreeNodes,
  removeTreeNode,
  updateSavedTreeFile,
  updateTreeFileContent,
} from '../utils/skillFileTree';

export type SkillWorkspacePendingIntent =
  | { type: 'publish' }
  | { type: 'leave' }
  | { type: 'switchVersion'; version: number }
  | { type: 'cancelEditing' }
  | null;

export interface SkillFileDraft {
  editorKey: string;
  fileId: string;
  revision: number;
  content: string | Blob;
}

export interface SkillFileSaveSnapshot extends SkillFileDraft {
  file: SkillFileNode;
}

export interface SkillConfigSaveSnapshot {
  revision: number;
  name: string;
  description: string;
}

export interface SkillWorkspaceDraftState {
  resourceKey: string;
  files: SkillFileNode[];
  persistedFiles: SkillFileNode[];
  fileDrafts: Record<string, SkillFileDraft>;
  savingFileRevisions: Record<string, number>;
  fileKeys: Record<string, string>;
  selectedFileId: string;
  selectedTreeNodeId: string;
  viewingVersion: number | null;
  editing: boolean;
  configName: string;
  configDescription: string;
  savedConfigName: string;
  savedConfigDescription: string;
  configRevision: number;
  configDirty: boolean;
  savingConfigRevision: number | null;
  nextRevision: number;
  pendingIntent: SkillWorkspacePendingIntent;
}

let editorKeySequence = 0;

function createEditorKey(file: SkillFileNode): string {
  editorKeySequence += 1;
  return `skill-file:${file.id}:${Date.now()}:${editorKeySequence}`;
}

export function collectSkillFileKeys(
  nodes: SkillFileNode[],
  current: Record<string, string> = {}
): Record<string, string> {
  const next = { ...current };
  for (const node of nodes) {
    if (node.kind === 'file' && !next[node.id]) next[node.id] = createEditorKey(node);
    if (node.children) Object.assign(next, collectSkillFileKeys(node.children, next));
  }
  return next;
}

function collectFileNodes(nodes: SkillFileNode[]): SkillFileNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'file' ? [node] : collectFileNodes(node.children ?? [])
  );
}

export function createSkillWorkspaceResourceKey(skill: SkillDetail): string {
  return `${skill.resourceId}:${skill.draftVersion}`;
}

export function createInitialSkillWorkspaceState(skill: SkillDetail): SkillWorkspaceDraftState {
  const firstFileId = getFirstFile(skill.files)?.id ?? '';
  return {
    resourceKey: createSkillWorkspaceResourceKey(skill),
    files: skill.files,
    persistedFiles: skill.files,
    fileDrafts: {},
    savingFileRevisions: {},
    fileKeys: collectSkillFileKeys(skill.files),
    selectedFileId: firstFileId,
    selectedTreeNodeId: firstFileId,
    viewingVersion: skill.draftVersion,
    editing: false,
    configName: skill.skillName,
    configDescription: skill.description,
    savedConfigName: skill.skillName,
    savedConfigDescription: skill.description,
    configRevision: 0,
    configDirty: false,
    savingConfigRevision: null,
    nextRevision: 1,
    pendingIntent: null,
  };
}

export function createEmptySkillWorkspaceState(): SkillWorkspaceDraftState {
  return {
    resourceKey: '',
    files: [],
    persistedFiles: [],
    fileDrafts: {},
    savingFileRevisions: {},
    fileKeys: {},
    selectedFileId: '',
    selectedTreeNodeId: '',
    viewingVersion: null,
    editing: false,
    configName: '',
    configDescription: '',
    savedConfigName: '',
    savedConfigDescription: '',
    configRevision: 0,
    configDirty: false,
    savingConfigRevision: null,
    nextRevision: 1,
    pendingIntent: null,
  };
}

export function getFileDraftByFileId(
  drafts: Record<string, SkillFileDraft>,
  fileId: string
): SkillFileDraft | null {
  return Object.values(drafts).find((draft) => draft.fileId === fileId) ?? null;
}

export function getSkillFileContent(
  file: SkillFileNode | null,
  drafts: Record<string, SkillFileDraft>
): string {
  if (!file) return '';
  const draft = getFileDraftByFileId(drafts, file.id);
  if (typeof draft?.content === 'string') return draft.content;
  return file.content ?? '';
}

export function getSkillFileEditorKey(
  file: SkillFileNode | null,
  fileKeys: Record<string, string>
): string {
  return file ? (fileKeys[file.id] ?? file.id) : '';
}

export function buildSkillFileSaveSnapshots(
  files: SkillFileNode[],
  drafts: Record<string, SkillFileDraft>,
  fileIds?: Set<string>
): SkillFileSaveSnapshot[] {
  return Object.values(drafts).flatMap((draft) => {
    if (fileIds && !fileIds.has(draft.fileId)) return [];
    const file = findFile(files, draft.fileId);
    return file ? [{ ...draft, file }] : [];
  });
}

export function collectDirtySkillNodeIds(
  nodes: SkillFileNode[],
  dirtyFileIds: Set<string>
): Set<string> {
  const dirtyNodeIds = new Set<string>();
  const walk = (items: SkillFileNode[]): boolean => {
    let hasDirtyNode = false;
    for (const item of items) {
      const dirty = item.kind === 'file' ? dirtyFileIds.has(item.id) : walk(item.children ?? []);
      if (dirty) {
        dirtyNodeIds.add(item.id);
        hasDirtyNode = true;
      }
    }
    return hasDirtyNode;
  };
  walk(nodes);
  return dirtyNodeIds;
}

function remapFileKeys(
  fileKeys: Record<string, string>,
  idMap: Map<string, string>
): Record<string, string> {
  const next = { ...fileKeys };
  idMap.forEach((nextId, previousId) => {
    if (!next[previousId]) return;
    next[nextId] = next[previousId];
    delete next[previousId];
  });
  return next;
}

function remapDrafts(
  drafts: Record<string, SkillFileDraft>,
  idMap: Map<string, string>
): Record<string, SkillFileDraft> {
  return Object.fromEntries(
    Object.entries(drafts).map(([key, draft]) => [
      key,
      { ...draft, fileId: idMap.get(draft.fileId) ?? draft.fileId },
    ])
  );
}

export function toPersistedSkillFiles(nodes: SkillFileNode[]): SkillFileNode[] {
  return nodes.flatMap((node): SkillFileNode[] => {
    if (node.kind === 'file') {
      return isLocalAssetId(node.id) ? [] : [{ ...node, contentBlob: undefined }];
    }
    const children = toPersistedSkillFiles(node.children ?? []);
    return children.length > 0 ? [{ ...node, children }] : [];
  });
}

export function applySavedSkillFiles(
  state: SkillWorkspaceDraftState,
  snapshots: SkillFileSaveSnapshot[],
  results: UploadSkillAssetResult[]
): SkillWorkspaceDraftState {
  const snapshotByKey = new Map(snapshots.map((snapshot) => [snapshot.editorKey, snapshot]));
  const successfulResults = results.filter((result) => !result.error);

  let files = state.files;
  let fileDrafts = { ...state.fileDrafts };
  const savingFileRevisions = { ...state.savingFileRevisions };
  const idMap = new Map<string, string>();

  for (const result of successfulResults) {
    const snapshot = snapshotByKey.get(result.clientId);
    if (!snapshot) continue;
    const nextId = result.assetId ?? snapshot.fileId;
    files = updateSavedTreeFile(files, snapshot.fileId, snapshot.content, nextId, result.objectKey);
    if (nextId !== snapshot.fileId) idMap.set(snapshot.fileId, nextId);
    const currentDraft = fileDrafts[snapshot.editorKey];
    if (currentDraft?.revision === snapshot.revision) delete fileDrafts[snapshot.editorKey];
  }

  for (const snapshot of snapshots) delete savingFileRevisions[snapshot.editorKey];
  fileDrafts = remapDrafts(fileDrafts, idMap);

  for (const snapshot of snapshots) {
    const result = results.find((candidate) => candidate.clientId === snapshot.editorKey);
    if (result && !result.error) continue;
    const currentDraft = fileDrafts[snapshot.editorKey];
    const baselineFile = findFile(files, currentDraft?.fileId ?? snapshot.fileId);
    if (
      currentDraft &&
      !isLocalAssetId(currentDraft.fileId) &&
      typeof currentDraft.content === 'string' &&
      currentDraft.content === (baselineFile?.content ?? '')
    ) {
      delete fileDrafts[snapshot.editorKey];
    }
  }

  return {
    ...state,
    files,
    persistedFiles: toPersistedSkillFiles(files),
    fileDrafts,
    savingFileRevisions,
    fileKeys: remapFileKeys(state.fileKeys, idMap),
    selectedFileId: idMap.get(state.selectedFileId) ?? state.selectedFileId,
    selectedTreeNodeId: idMap.get(state.selectedTreeNodeId) ?? state.selectedTreeNodeId,
  };
}

export function finishFailedSkillFileSave(
  state: SkillWorkspaceDraftState,
  snapshots: SkillFileSaveSnapshot[]
): SkillWorkspaceDraftState {
  const savingFileRevisions = { ...state.savingFileRevisions };
  const fileDrafts = { ...state.fileDrafts };
  for (const snapshot of snapshots) {
    delete savingFileRevisions[snapshot.editorKey];
    const currentDraft = fileDrafts[snapshot.editorKey];
    const baselineFile = findFile(state.files, currentDraft?.fileId ?? snapshot.fileId);
    if (
      currentDraft &&
      !isLocalAssetId(currentDraft.fileId) &&
      typeof currentDraft.content === 'string' &&
      currentDraft.content === (baselineFile?.content ?? '')
    ) {
      delete fileDrafts[snapshot.editorKey];
    }
  }
  return { ...state, fileDrafts, savingFileRevisions };
}

export interface ApplySkillMoveOptions {
  files: SkillFileNode[];
  idMap: Map<string, string>;
  objectKeyMap?: Map<string, string>;
  savedSnapshots?: SkillFileSaveSnapshot[];
  persist: boolean;
}

export function applySkillMove(
  state: SkillWorkspaceDraftState,
  {
    files: movedFiles,
    idMap,
    objectKeyMap = new Map(),
    savedSnapshots = [],
    persist,
  }: ApplySkillMoveOptions
): SkillWorkspaceDraftState {
  let files = remapTreeNodes(movedFiles, idMap, objectKeyMap);
  const fileDrafts = remapDrafts(state.fileDrafts, idMap);
  const savingFileRevisions = { ...state.savingFileRevisions };

  for (const snapshot of savedSnapshots) {
    const nextId = idMap.get(snapshot.fileId) ?? snapshot.fileId;
    files = updateSavedTreeFile(
      files,
      nextId,
      snapshot.content,
      nextId,
      objectKeyMap.get(snapshot.fileId)
    );
    const currentDraft = fileDrafts[snapshot.editorKey];
    if (currentDraft?.revision === snapshot.revision) delete fileDrafts[snapshot.editorKey];
    delete savingFileRevisions[snapshot.editorKey];
  }

  return {
    ...state,
    files,
    persistedFiles: persist ? toPersistedSkillFiles(files) : state.persistedFiles,
    fileDrafts,
    savingFileRevisions,
    fileKeys: collectSkillFileKeys(files, remapFileKeys(state.fileKeys, idMap)),
    selectedFileId: idMap.get(state.selectedFileId) ?? state.selectedFileId,
    selectedTreeNodeId: idMap.get(state.selectedTreeNodeId) ?? state.selectedTreeNodeId,
  };
}

export function removeSkillWorkspaceNodes(
  state: SkillWorkspaceDraftState,
  removeIds: Set<string>
): SkillWorkspaceDraftState {
  const fileDrafts = Object.fromEntries(
    Object.entries(state.fileDrafts).filter(([, draft]) => !removeIds.has(draft.fileId))
  );
  const fileKeys = Object.fromEntries(
    Object.entries(state.fileKeys).filter(([fileId]) => !removeIds.has(fileId))
  );
  return {
    ...state,
    files: removeTreeNode(state.files, removeIds),
    persistedFiles: removeTreeNode(state.persistedFiles, removeIds),
    fileDrafts,
    savingFileRevisions: Object.fromEntries(
      Object.entries(state.savingFileRevisions).filter(([key]) => Boolean(fileDrafts[key]))
    ),
    fileKeys,
    selectedFileId: removeIds.has(state.selectedFileId) ? '' : state.selectedFileId,
    selectedTreeNodeId: removeIds.has(state.selectedTreeNodeId) ? '' : state.selectedTreeNodeId,
  };
}

export function registerLocalSkillFileDrafts(
  state: SkillWorkspaceDraftState,
  files: SkillFileNode[]
): Pick<SkillWorkspaceDraftState, 'fileDrafts' | 'fileKeys' | 'nextRevision'> {
  const fileDrafts = { ...state.fileDrafts };
  const fileKeys = collectSkillFileKeys(files, state.fileKeys);
  let nextRevision = state.nextRevision;
  for (const file of collectFileNodes(files)) {
    if (!isLocalAssetId(file.id)) continue;
    const editorKey = fileKeys[file.id];
    if (fileDrafts[editorKey]) continue;
    fileDrafts[editorKey] = {
      editorKey,
      fileId: file.id,
      revision: nextRevision,
      content: file.contentBlob ?? file.content ?? '',
    };
    nextRevision += 1;
  }
  return { fileDrafts, fileKeys, nextRevision };
}

export function updateLoadedSkillFileContent(
  state: SkillWorkspaceDraftState,
  fileId: string,
  content: string
): SkillWorkspaceDraftState {
  return {
    ...state,
    files: updateTreeFileContent(state.files, fileId, content),
    persistedFiles: updateTreeFileContent(state.persistedFiles, fileId, content),
  };
}
