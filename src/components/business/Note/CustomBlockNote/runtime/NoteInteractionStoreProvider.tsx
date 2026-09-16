import { type ReactNode, useEffect, useState } from 'react';

import {
  createNoteInteractionStore,
  type NoteInteractionState,
  NoteInteractionStoreContext,
} from './noteInteractionStore';

export function NoteInteractionStoreProvider({
  access,
  children,
}: {
  access: NoteInteractionState['access'];
  children: ReactNode;
}) {
  const [store] = useState(() => createNoteInteractionStore(access));
  const { blockLocalDocWrites, readOnly } = access;
  /**
   * @wisepen-manual-effect
   * 执行时机：编辑器实例的权限或连接写入条件变化时同步实例级交互状态。
   * 不可替代原因：access 是外部事实输入，不能通过 reducer 事件之外的渲染派生完成取消浮层。
   * cleanup：无订阅资源，仅同步最新事实。
   */
  useEffect(() => {
    store.getState().dispatch({
      type: 'ACCESS_CHANGED',
      access: { blockLocalDocWrites, readOnly },
    });
  }, [blockLocalDocWrites, readOnly, store]);
  return (
    <NoteInteractionStoreContext.Provider value={store}>
      {children}
    </NoteInteractionStoreContext.Provider>
  );
}
