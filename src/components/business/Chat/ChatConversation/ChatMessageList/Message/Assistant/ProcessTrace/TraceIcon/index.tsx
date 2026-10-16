import { Brain, Sparkles, Wrench } from 'lucide-react';

import { getToolDisplayName } from '../../traceModel';
import type { TraceIconProps } from './index.type';

/** 过程节点类别图标：思考、Skill 加载、普通工具调用 */
function TraceIcon({ item, tone, className }: TraceIconProps) {
  if (item.kind === 'reasoning') {
    return <Brain size={14} aria-hidden="true" className={className} data-tone={tone} />;
  }
  const isSkill = getToolDisplayName(item.part).toLowerCase().includes('skill');
  return isSkill ? (
    <Sparkles size={14} aria-hidden="true" className={className} data-tone={tone} />
  ) : (
    <Wrench size={14} aria-hidden="true" className={className} data-tone={tone} />
  );
}

export default TraceIcon;
