import { CircleQuestionMark } from 'lucide-react';

import AppIconButton from '@/components/base/Button/AppIconButton';

import type { FieldHelpProps } from './index.type';

/** 字段级帮助入口：默认隐藏说明，仅在用户主动查看时展示。 */
function FieldHelp({ content, label, placement = 'top' }: FieldHelpProps) {
  return (
    <AppIconButton
      icon={<CircleQuestionMark size={15} strokeWidth={1.8} aria-hidden />}
      label={label}
      size="sm"
      tooltip={{ content, placement, offset: 4 }}
    />
  );
}

export type { FieldHelpProps };
export default FieldHelp;
