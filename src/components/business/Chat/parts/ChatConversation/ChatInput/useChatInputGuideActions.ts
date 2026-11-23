import { useEffect } from 'react';
import type { StoreApi } from 'zustand/vanilla';

import { registerGuideActionHandlers } from '@/components/base/Guide';
import { GUIDE_ACTION_ID } from '@/constants/tour';

import type { ChatInputStoreState } from './_context/ChatInputStore';

/** 注册输入区引导动作：展开模型 / 上传 / Agent / 技能菜单。 */
export function useChatInputGuideActions(store: StoreApi<ChatInputStoreState>): void {
  /**
   * @wisepen-manual-effect
   * 执行时机：输入区挂载时注册引导动作，卸载时撤销。
   * 不可替代原因：引导层需要直接调用输入区 store 的 setter 展开抽屉，不能依赖 DOM 点击。
   * cleanup：撤销四个动作处理器，避免指向已卸载的输入区。
   */
  useEffect(() => {
    const openOnly = (open: (state: ChatInputStoreState) => void): void => {
      const state = store.getState();
      state.setModelOpen(false);
      state.setAttachmentOpen(false);
      state.setAgentOpen(false);
      state.setSkillMenuOpen(false);
      open(state);
    };
    return registerGuideActionHandlers({
      [GUIDE_ACTION_ID.openModelMenu]: {
        isOpen: () => store.getState().modelOpen,
        open: () => openOnly((state) => state.setModelOpen(true)),
        close: () => store.getState().setModelOpen(false),
      },
      [GUIDE_ACTION_ID.openUploadMenu]: {
        isOpen: () => store.getState().attachmentOpen,
        open: () => openOnly((state) => state.setAttachmentOpen(true)),
        close: () => store.getState().setAttachmentOpen(false),
      },
      [GUIDE_ACTION_ID.openAgentMenu]: {
        isOpen: () => store.getState().agentOpen,
        open: () => openOnly((state) => state.setAgentOpen(true)),
        close: () => store.getState().setAgentOpen(false),
      },
      [GUIDE_ACTION_ID.openSkillMenu]: {
        isOpen: () => store.getState().skillMenuOpen,
        open: () => openOnly((state) => state.setSkillMenuOpen(true)),
        close: () => store.getState().setSkillMenuOpen(false),
      },
    });
  }, [store]);
}
