import type { TraceItem } from '../../../../_common/traceModel';

export interface TraceStepDetailProps {
  item: TraceItem;
  measuredDurations: Readonly<Record<string, number>>;
}
