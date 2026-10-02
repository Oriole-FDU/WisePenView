import type { SupportedLanguage } from '@/i18n/resources';

import type { BrowserTimeContext } from './browserTime';

export interface FrontendStateValues {
  /** 当前打开的资源；进入资源页或切换课程资源时写入，资源身份或查看方式变化时替换，离开宿主时清除。 */
  workspace_open_resource: WorkspaceOpenResourceValue;
  /** 当前 Note 编辑器的内容签名；签名生成或变化时写入，资源切换、签名失效或编辑器卸载时替换或清除；请求条目标记 disabled。 */
  note_client_content_signature: string;
  /** 发起“询问 AI”时选中的 Note 文本；每次新选区整组替换，取消上下文或发送被接受后清除。 */
  selected_text: string;
  /** 选区对应的 Note 块范围；与 selected_text 同时写入，新选区无范围时移除，选区清理时一并清除。 */
  selected_note_scope: SelectedNoteScopeValue;
  /** 输入区添加的资源引用；选择或移除引用时更新，切换会话、输入区卸载或发送被接受后清除。 */
  selected_resources: SelectedResourceReference[];
  /** 发送时的浏览器本地时间和时区；每次读取请求快照时重新生成，不由业务模块写入或缓存。 */
  time: BrowserTimeContext;
  /** 发送时生效的界面语言；每次读取请求快照时从 i18n 获取，语言变化会反映在下一次读取中。 */
  locale: SupportedLanguage;
}

export type FrontendStateKey = keyof FrontendStateValues;
export type FrontendStateEntry<Key extends FrontendStateKey = FrontendStateKey> = {
  [K in Key]: { key: K; value: FrontendStateValues[K]; disabled?: boolean };
}[Key];

export const FRONTEND_STATE_SOURCE = {
  RESOURCE: 'resource',
  NOTE_EDITOR: 'note-editor',
  SELECTION: 'selection',
  INPUT: 'input',
} as const;

export interface WorkspaceOpenResourceValue {
  resource_id: string;
  resource_type: string;
  viewer?: string;
  editor_type?: string;
}

export type SelectedNoteScopeValue =
  | { type: 'blocks'; block_ids: string[]; include_children?: boolean }
  | { type: 'subtree'; root_block_id: string }
  | {
      type: 'block_range';
      start_block_id: string;
      end_block_id: string;
      include_partial?: boolean;
    };

export interface SelectedResourceReference {
  resource_id: string;
  resource_name: string;
  resource_type: string;
}
