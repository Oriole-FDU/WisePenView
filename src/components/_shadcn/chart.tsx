import { clsx } from 'clsx';
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react';
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import styles from './chart.module.less';

export type ChartConfig = Record<string, { label?: ReactNode; color?: string }>;

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = createContext<ChartContextValue | null>(null);

function useChart() {
  const context = useContext(ChartContext);
  if (!context) throw new Error('useChart must be used within ChartContainer');
  return context;
}

interface ChartContainerProps extends ComponentProps<'div'> {
  config: ChartConfig;
  children: ComponentProps<typeof ResponsiveContainer>['children'];
}

function ChartContainer({ id, className, config, children, ...props }: ChartContainerProps) {
  const uniqueId = useId();
  const chartId = `chart-${id ?? uniqueId.replaceAll(':', '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div data-chart={chartId} className={clsx(styles.container, className)} {...props}>
        <ResponsiveContainer initialDimension={{ width: 180, height: 180 }}>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

interface ChartTooltipContentProps extends TooltipContentProps<TooltipValueType, string | number> {
  valueFormatter?: (value: number) => ReactNode;
}

function ChartTooltipContent({ active, payload, valueFormatter }: ChartTooltipContentProps) {
  const { config } = useChart();
  if (!active || !payload.length) return null;

  const item = payload[0];
  const value = typeof item.value === 'number' ? item.value : Number(item.value ?? 0);
  const key = String(item.name ?? item.dataKey ?? 'value');
  const label = config[key]?.label ?? item.name;
  const color =
    item.payload && typeof item.payload === 'object' && 'fill' in item.payload
      ? String(item.payload.fill)
      : item.color;

  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipIndicator} style={{ backgroundColor: color }} aria-hidden />
      <span className={styles.tooltipLabel}>{label}</span>
      <strong>{valueFormatter ? valueFormatter(value) : value.toLocaleString()}</strong>
    </div>
  );
}

const ChartTooltip = RechartsTooltip;

export { ChartContainer, ChartTooltip, ChartTooltipContent };
