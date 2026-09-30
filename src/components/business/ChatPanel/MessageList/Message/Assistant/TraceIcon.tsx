import { Brain, Sparkles, Wrench } from 'lucide-react';

import { getToolDisplayName, type TraceItem, type TraceTone } from './traceModel';

interface TraceIconProps {
  item: TraceItem;
  tone: TraceTone;
  className?: string;
}

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
