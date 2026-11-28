// 部分公开类型仍在组件入口，涉及复合组件、插件或泛型关系，待后续迁移。
export interface NoteToolbarProps {
  onAskAi: () => void;
  onAddComment: () => void;
  onOpenFind: (initialQuery?: string) => void;
  isFindModeActive: boolean;
}
