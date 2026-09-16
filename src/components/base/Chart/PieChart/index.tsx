import { Card } from '@heroui/react';
import { Cell, Pie, PieChart as RechartsPieChart } from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/_shadcn';

import type { PieChartItem, PieChartProps } from './index.type';
import styles from './style.module.less';

interface PieDatum extends PieChartItem {
  fill: string;
}

const DEFAULT_VALUE_FORMATTER = (value: number) => value.toLocaleString();

function PieChart({
  items,
  ariaLabel,
  variant = 'card',
  icon,
  title,
  description,
  targetValue,
  unallocatedLabel = 'Unallocated',
  emptyLabel = 'No data',
  valueFormatter = DEFAULT_VALUE_FORMATTER,
  className,
}: PieChartProps) {
  const normalizedItems = items
    .map((item) => ({ ...item, value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0 }))
    .filter((item) => item.value > 0);
  const total = normalizedItems.reduce((sum, item) => sum + item.value, 0);
  const remaining = targetValue === undefined ? 0 : Math.max(0, targetValue - total);
  const data: PieDatum[] = normalizedItems.map((item, index) => ({
    ...item,
    fill: item.color ?? `var(--pie-chart-color-${(index % 5) + 1})`,
  }));

  if (remaining > 0) {
    data.push({
      id: '__unallocated__',
      label: unallocatedLabel,
      value: remaining,
      fill: 'var(--pie-chart-unallocated)',
    });
  }
  if (data.length === 0) {
    data.push({
      id: '__empty__',
      label: emptyLabel,
      value: targetValue && targetValue > 0 ? targetValue : 1,
      fill: 'var(--pie-chart-unallocated)',
    });
  }

  const config: ChartConfig = Object.fromEntries(
    data.map((item) => [item.id, { label: item.label, color: item.fill }])
  );
  const panelClassName = [
    styles.panel,
    variant === 'section' ? styles.section : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const Title = variant === 'section' ? 'h2' : 'h3';

  return (
    <Card variant={variant === 'section' ? 'transparent' : 'default'} className={panelClassName}>
      <Card.Content className={styles.content}>
        {(title || description) && (
          <header className={styles.header}>
            {icon ? <span className={styles.headerIcon}>{icon}</span> : null}
            <div className={styles.heading}>
              {title ? <Title>{title}</Title> : null}
              {description ? <p>{description}</p> : null}
            </div>
          </header>
        )}
        <div className={styles.body}>
          <ChartContainer
            config={config}
            className={styles.chart}
            role="img"
            aria-label={ariaLabel}
          >
            <RechartsPieChart accessibilityLayer>
              <ChartTooltip
                cursor={false}
                content={(props) => (
                  <ChartTooltipContent {...props} valueFormatter={valueFormatter} />
                )}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="id"
                startAngle={0}
                endAngle={360}
                innerRadius={0}
                outerRadius={82}
                stroke="var(--surface)"
                strokeWidth={2}
                animationBegin={0}
                animationDuration={650}
                animationEasing="ease-out"
                isAnimationActive="auto"
              >
                {data.map((item) => (
                  <Cell key={item.id} fill={item.fill} />
                ))}
              </Pie>
            </RechartsPieChart>
          </ChartContainer>
          <ul className={styles.legend}>
            {data.map((item) => (
              <li key={item.id}>
                <span
                  className={styles.legendIndicator}
                  style={{ backgroundColor: item.fill }}
                  aria-hidden
                />
                <span className={styles.legendText} title={item.label}>
                  <span>{item.label}</span>
                  <strong>{valueFormatter(item.id === '__empty__' ? 0 : item.value)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card.Content>
    </Card>
  );
}

export default PieChart;
export type { PieChartItem, PieChartProps } from './index.type';
