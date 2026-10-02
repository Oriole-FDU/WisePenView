import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { useChatDockState } from '@/layouts/ChatDockLayout';

/** 资源顶栏里的对话开关：只读对话 dock 状态，不带任何资源布局语义。 */
export default function ResourceChatToggleButton() {
  const { t } = useTranslation('chat');
  const { collapsed, toggle } = useChatDockState();
  const label = collapsed ? t('panel.expand') : t('panel.collapse');

  return (
    <AppIconButton
      icon={
        collapsed ? (
          <PanelRightOpen size={18} aria-hidden="true" />
        ) : (
          <PanelRightClose size={18} aria-hidden="true" />
        )
      }
      label={label}
      size="sm"
      onPress={toggle}
    />
  );
}
