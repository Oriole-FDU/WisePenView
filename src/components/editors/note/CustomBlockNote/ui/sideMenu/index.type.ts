// 部分公开类型仍在组件入口，涉及复合组件、插件或泛型关系，待后续迁移。
import type { NoteContentPlugin } from '@/components/editors/note/CustomBlockNote/registry/types';

export interface NoteSideMenuProps {
  plugins: readonly NoteContentPlugin[];
}
