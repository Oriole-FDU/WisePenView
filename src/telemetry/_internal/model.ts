import type { Attributes, Context } from '@opentelemetry/api';

export interface Breadcrumb {
  at: number;
  name: string;
  attributes: Attributes;
}

export interface TelemetrySnapshot {
  authVersion: number;
  attributes: Attributes;
  breadcrumbs: readonly Breadcrumb[];
}

export interface TelemetryEvent {
  name: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  attributes: Attributes;
  timestamp: number;
  context?: Context;
}

export type TelemetrySink = (event: TelemetryEvent) => void;
