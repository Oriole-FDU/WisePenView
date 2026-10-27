import type { TelemetryEvent, TelemetrySink } from './model';

const WINDOW_MS = 60_000;
const MAX_GROUPS = 100;
const MAX_EVENTS_PER_WINDOW = 200;

interface EventGroup {
  first: TelemetryEvent;
  lastAt: number;
  count: number;
}

/** 同一指纹的首次事件立即发送，窗口内的后续发生只产生摘要。 */
export class ErrorAggregation {
  private readonly groups = new Map<string, EventGroup>();
  private readonly sink: TelemetrySink;
  private readonly now: () => number;
  private budgetStartedAt: number;
  private emitted = 0;
  private dropped = 0;

  constructor(sink: TelemetrySink, now = Date.now) {
    this.sink = sink;
    this.now = now;
    this.budgetStartedAt = now();
  }

  record(event: TelemetryEvent): void {
    this.flush();
    const attributes = event.attributes;
    const key = JSON.stringify([
      attributes['error.fingerprint'],
      attributes['service.version'],
      attributes['page.route'],
      attributes['error.detector'],
      attributes['operation.name'],
      attributes['resource.id'],
      attributes['user.id'],
      attributes['session.id'],
    ]);
    const group = this.groups.get(key);
    if (group) {
      group.count += 1;
      group.lastAt = event.timestamp;
      return;
    }

    if (this.groups.size >= MAX_GROUPS) {
      const oldest = this.groups.keys().next().value;
      if (oldest !== undefined) this.finishGroup(oldest);
    }

    event.attributes = {
      ...attributes,
      'error.occurrence_count': 1,
      'error.total_count': 1,
    };
    this.groups.set(key, { first: event, lastAt: event.timestamp, count: 1 });
    this.emit(event);
  }

  flush(force = false): void {
    this.resetBudget();
    for (const [key, group] of this.groups) {
      if (force || this.now() - group.first.timestamp >= WINDOW_MS) this.finishGroup(key);
    }
    if (force) this.reportDropped();
  }

  private finishGroup(key: string): void {
    const group = this.groups.get(key);
    if (!group) return;
    this.groups.delete(key);
    if (group.count < 2) return;
    const { first } = group;
    this.emit({
      ...first,
      name: 'frontend.error_summary',
      timestamp: group.lastAt,
      attributes: {
        ...first.attributes,
        'error.occurrence_count': group.count - 1,
        'error.total_count': group.count,
        'error.first_seen': new Date(first.timestamp).toISOString(),
        'error.last_seen': new Date(group.lastAt).toISOString(),
      },
      exception: undefined,
    });
  }

  private emit(event: TelemetryEvent): void {
    this.resetBudget();
    if (this.emitted >= MAX_EVENTS_PER_WINDOW) {
      this.dropped += 1;
      return;
    }
    this.emitted += 1;
    this.send(event);
  }

  private resetBudget(): void {
    if (this.now() - this.budgetStartedAt < WINDOW_MS) return;
    this.budgetStartedAt = this.now();
    this.emitted = 0;
    this.reportDropped();
  }

  private reportDropped(): void {
    if (this.dropped === 0 || this.emitted >= MAX_EVENTS_PER_WINDOW) return;
    const dropped = this.dropped;
    this.dropped = 0;
    this.emitted += 1;
    this.send({
      name: 'telemetry.events_dropped',
      severity: 'WARN',
      message: 'Telemetry event limit reached',
      timestamp: this.now(),
      attributes: { 'telemetry.dropped_count': dropped },
    });
  }

  private send(event: TelemetryEvent): void {
    try {
      this.sink(event);
    } catch {
      this.dropped += 1;
    }
  }
}
