'use client';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import styles from './accordion.module.less';

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={clsx(styles.accordion, className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={clsx(styles.item, className)}
      {...props}
    />
  );
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className={styles.header}>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={clsx(styles.trigger, className)}
        {...props}
      >
        <span className={styles.triggerContent}>{children}</span>
        <ChevronDown aria-hidden="true" className={styles.indicator} size={16} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={clsx(styles.content, className)}
      {...props}
    >
      <div className={styles.contentInner}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export type {
  AccordionPanelProps as AccordionContentProps,
  AccordionItemProps,
  AccordionRootProps as AccordionProps,
  AccordionTriggerProps,
} from '@base-ui/react/accordion';
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
