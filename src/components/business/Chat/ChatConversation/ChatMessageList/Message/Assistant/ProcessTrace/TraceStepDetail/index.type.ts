import type { TraceItem } from '../../traceModel';

export interface TraceStepDetailProps {
  item: TraceItem;
  measuredDurations: Readonly<Record<string, number>>;
}
