import type { Attributes, Context } from '@opentelemetry/api';

import type { ExceptionDetector, ExceptionLocation } from '../publicTypes';

export type ObservationSeverity = 'INFO' | 'WARN' | 'ERROR';

export interface Breadcrumb {
  at: number;
  name: string;
  attributes: Attributes;
}

export interface ContextSnapshot {
  attributes: Attributes;
  breadcrumbs: readonly Breadcrumb[];
  breadcrumbsDropped: number;
}

export interface ExceptionObservation {
  id: string;
  detector: ExceptionDetector;
  occurredAt: number;
  errorType: string;
  message: string;
  stack?: string;
  componentStack?: string;
  location?: ExceptionLocation;
  code?: number;
  source?: string;
}

export interface ExceptionDetails {
  type: string;
  message: string;
  stack?: string;
}

export interface TelemetryEvent {
  name: string;
  severity: ObservationSeverity;
  message: string;
  timestamp: number;
  attributes: Attributes;
  context?: Context;
  exception?: ExceptionDetails;
}

export type TelemetrySink = (event: TelemetryEvent) => void;
