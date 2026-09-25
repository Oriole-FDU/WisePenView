'use client';

import { clsx } from 'clsx';
import * as React from 'react';
import styles from './marker.module.less';

type MarkerVariant = 'default' | 'border' | 'separator';

interface MarkerProps extends React.ComponentProps<'div'> {
  variant?: MarkerVariant;
}

function Marker({ className, variant = 'default', ...props }: MarkerProps) {
  return (
    <div
      data-slot="marker"
      data-variant={variant}
      className={clsx(
        styles.marker,
        variant === 'border' && styles.variantBorder,
        variant === 'separator' && styles.variantSeparator,
        className
      )}
      {...props}
    />
  );
}

function MarkerIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={clsx(styles.icon, className)}
      {...props}
    />
  );
}

function MarkerContent({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="marker-content" className={clsx(styles.content, className)} {...props} />;
}

export { Marker, MarkerContent, MarkerIcon };
export type { MarkerProps, MarkerVariant };
