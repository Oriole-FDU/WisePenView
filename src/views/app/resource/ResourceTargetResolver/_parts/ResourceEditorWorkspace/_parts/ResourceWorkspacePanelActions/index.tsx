import { Bot, type LucideIcon, MessageSquareText, MessagesSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { GuideAnchor } from '@/components/base/Guide';
import { GUIDE_TOOL_ID } from '@/constants/tour';
import {
  getWorkspacePanelTargetId,
  useWorkspaceRightPanel,
  WORKSPACE_PANEL_IDS,
  type WorkspacePanelId,
} from '@/layouts/WorkspaceRightPanelLayout';

interface ResourceWorkspacePanelActionsProps {
  inlineCommentAvailable: boolean;
  interactAvailable: boolean;
}

function ResourceWorkspacePanelActions({
  inlineCommentAvailable,
  interactAvailable,
}: ResourceWorkspacePanelActionsProps) {
  const { t } = useTranslation('resource');
  const { activePanelId, togglePanel } = useWorkspaceRightPanel();
  const triggerRefs = useRef<Partial<Record<WorkspacePanelId, HTMLButtonElement | null>>>({});
  const previousActivePanelRef = useRef(activePanelId);

  const chatLabel =
    activePanelId === 'chat' ? t('sidePanel.collapseChat') : t('sidePanel.expandChat');
  const inlineCommentLabel =
    activePanelId === 'inlineComment'
      ? t('sidePanel.collapseAnnotation')
      : t('sidePanel.expandAnnotation');
  const interactLabel =
    activePanelId === 'interact'
      ? t('sidePanel.collapseInteraction')
      : t('sidePanel.expandInteraction');
  const unavailableInlineCommentLabel = t('sidePanel.inlineCommentUnavailable');
  const unavailableInteractLabel = t('sidePanel.interactUnavailable');
  const triggerMeta: Record<
    WorkspacePanelId,
    {
      icon: LucideIcon;
      label: string;
      unavailableLabel?: string;
      disabled: boolean;
    }
  > = {
    inlineComment: {
      icon: MessageSquareText,
      label: inlineCommentLabel,
      unavailableLabel: unavailableInlineCommentLabel,
      disabled: !inlineCommentAvailable,
    },
    interact: {
      icon: MessagesSquare,
      label: interactLabel,
      unavailableLabel: unavailableInteractLabel,
      disabled: !interactAvailable,
    },
    chat: {
      icon: Bot,
      label: chatLabel,
      disabled: false,
    },
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：右栏从某个面板关闭时。
   * 不可替代原因：关闭按钮已位于即将隐藏的 portal 中，必须把焦点送回对应的顶栏触发按钮。
   * cleanup：取消尚未执行的动画帧，避免卸载后移动焦点。
   */
  useEffect(() => {
    const previousActivePanelId = previousActivePanelRef.current;
    previousActivePanelRef.current = activePanelId;
    if (!previousActivePanelId || activePanelId) return;

    const frame = window.requestAnimationFrame(() => {
      const trigger = triggerRefs.current[previousActivePanelId];
      const nextFocus = trigger && !trigger.disabled ? trigger : triggerRefs.current.chat;
      nextFocus?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePanelId]);

  return (
    <>
      {WORKSPACE_PANEL_IDS.map((panelId) => {
        const meta = triggerMeta[panelId];
        const Icon = meta.icon;
        const label = meta.disabled && meta.unavailableLabel ? meta.unavailableLabel : meta.label;
        const trigger = (
          <AppIconButton
            key={panelId}
            ref={(node) => {
              triggerRefs.current[panelId] = node;
            }}
            icon={<Icon size={18} aria-hidden="true" />}
            label={label}
            size="sm"
            isActive={activePanelId === panelId}
            isDisabled={meta.disabled}
            aria-controls={getWorkspacePanelTargetId(panelId)}
            aria-expanded={activePanelId === panelId}
            tooltip={{ content: label }}
            onPress={() => togglePanel(panelId)}
          />
        );
        return panelId === 'chat' ? (
          <GuideAnchor key={panelId} id={GUIDE_TOOL_ID.noteChat}>
            {trigger}
          </GuideAnchor>
        ) : (
          trigger
        );
      })}
    </>
  );
}

export default ResourceWorkspacePanelActions;
