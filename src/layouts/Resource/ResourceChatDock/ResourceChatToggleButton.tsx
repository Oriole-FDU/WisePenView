import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { useChatDockState } from '@/layouts/ChatDockLayout';

/**
 * 资源顶栏里的聊天开关。
 * 折叠态读应用壳 chat dock store，资源布局不持有聊天状态，只把开关作为顶栏动作插槽传入。
 */
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
