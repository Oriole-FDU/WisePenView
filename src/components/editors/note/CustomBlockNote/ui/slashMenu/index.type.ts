// 部分公开类型仍在组件入口，涉及复合组件、插件或泛型关系，待后续迁移。
import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';
import type { NoteContentPlugin } from '../../registry/types';

export interface NoteSlashMenuProps {
  editor: CustomBlockNoteEditor;
  plugins: readonly NoteContentPlugin[];
}
