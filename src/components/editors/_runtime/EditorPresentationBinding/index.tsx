import { useEffect, useRef, useState } from 'react';

import { useEditorSurface } from '../../_context';
import type { EditorPresentation } from '../../editor.type';
import { createPresentationSlot } from './createPresentationSlot';

/** 同步编辑器展示信息并渲染扩展槽位，与正文并列挂载。 */
export default function EditorPresentationBinding(presentation: EditorPresentation) {
  const { onPresentationChange } = useEditorSurface();
  const [slots] = useState(() => ({
    titleMeta: createPresentationSlot(),
    leadingActions: createPresentationSlot(),
    actions: createPresentationSlot(),
    advanced: createPresentationSlot(),
    inlineComment: createPresentationSlot(true),
  }));
  const unregister = useRef<(() => void) | undefined>(undefined);
  const resource = presentation.header && presentation.header.resource;
  const inlineComment = presentation.sidePanel?.inlineComment;
  const reported: EditorPresentation = {
    ...presentation,
    header: resource
      ? {
          resource: {
            ...resource,
            titleMeta: resource.titleMeta ? slots.titleMeta.target : undefined,
            leadingActions: resource.leadingActions ? slots.leadingActions.target : undefined,
            actions: resource.actions ? slots.actions.target : undefined,
            moreMenu: resource.moreMenu
              ? {
                  ...resource.moreMenu,
                  advanced: resource.moreMenu.advanced ? slots.advanced.target : undefined,
                }
              : undefined,
          },
        }
      : presentation.header,
    sidePanel: presentation.sidePanel
      ? {
          ...presentation.sidePanel,
          inlineComment: inlineComment ? slots.inlineComment.target : undefined,
        }
      : undefined,
  };
  /**
   * @wisepen-manual-effect
   * 执行时机：编辑器内容提交后同步外层布局所需的展示信息。
   * 不可替代原因：标题、动作与批注由领域会话产生，布局在另一子树中独立订阅。
   * cleanup：更新不清空展示，统一由卸载清理撤销最后一次上报。
   */
  useEffect(() => {
    unregister.current = onPresentationChange(reported);
  });
  /**
   * @wisepen-manual-effect
   * 执行时机：展示绑定挂载时建立注销生命周期。
   * 不可替代原因：上报产生的注销函数必须对应最后一次展示。
   * cleanup：仅撤销当前绑定的最新上报，旧绑定不能清理新绑定。
   */
  useEffect(() => () => unregister.current?.(), []);

  return (
    <>
      {slots.titleMeta.render(resource ? resource.titleMeta : null)}
      {slots.leadingActions.render(resource ? resource.leadingActions : null)}
      {slots.actions.render(resource ? resource.actions : null)}
      {slots.advanced.render(resource ? resource.moreMenu?.advanced : null)}
      {slots.inlineComment.render(inlineComment)}
    </>
  );
}
