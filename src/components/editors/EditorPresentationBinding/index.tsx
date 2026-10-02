import { useEffect, useState } from 'react';

import { useEditorSurface } from '../_context';
import type { EditorPresentation } from '../editor.type';
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
   * cleanup：仅撤销本次上报，防止已卸载的会话继续占用顶栏和侧栏。
   */
  useEffect(() => onPresentationChange(reported));

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
