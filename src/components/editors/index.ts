export type {
  Editor,
  EditorHostCapabilities,
  EditorKind,
  EditorPresentation,
  EditorSnapshot,
  EditorSurfaceProps,
  EditorTarget,
} from './editor.type';
export { editorRegistry, resolveEditorKind } from './editorRegistry';
export { default as ResourceEditor, type ResourceEditorProps } from './ResourceEditor';
