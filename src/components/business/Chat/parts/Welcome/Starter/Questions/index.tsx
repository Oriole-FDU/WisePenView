import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';

import { AppPressable } from '@/components/base/Button';

import type {
  WelcomeQuestionItem,
  WelcomeQuestionsBlock,
  WelcomeQuestionsVariant,
} from '../index.type';
import type { WelcomeQuestionsSectionProps } from './index.type';
import styles from './style.module.scss';

function normalizeQuestionVariant(
  variant: WelcomeQuestionsVariant | undefined
): 'list' | 'bubbles' | 'pillWrap' | 'pillScroll' {
  if (variant === 'pillScroll') return 'pillScroll';
  if (variant === 'bubbles') return 'bubbles';
  if (variant === 'wrap' || variant === 'pillWrap') return 'pillWrap';
  return 'list';
}

function QuestionPillButton({
  item,
  variant,
  onPick,
}: {
  item: WelcomeQuestionItem;
  variant: 'list' | 'bubbles' | 'pillWrap' | 'pillScroll';
  onPick: () => void;
}) {
  const ItemIcon = item.icon;
  const showPillIcon = ItemIcon && variant !== 'list';

  return (
    <AppPressable
      className={clsx(
        styles.questionBubble,
        variant === 'bubbles' && styles.questionBubbleStack,
        variant === 'pillWrap' && styles.questionPillIcon,
        variant === 'pillScroll' && styles.questionPillScroll
      )}
      onClick={onPick}
    >
      {showPillIcon ? (
        <span className={styles.pillIconOrb} data-tone={item.iconTone ?? 'violet'} aria-hidden>
          <ItemIcon />
        </span>
      ) : null}
      <span className={styles.questionBubbleText}>{item.label}</span>
      {variant === 'list' ? (
        <ChevronRight className={styles.questionBubbleChevron} aria-hidden />
      ) : null}
    </AppPressable>
  );
}

function PillScrollStrip({
  items,
  onPick,
}: {
  items: WelcomeQuestionsBlock['items'];
  onPick: (item: WelcomeQuestionsBlock['items'][number]) => void;
}) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncScrollEdges = () => {
    const node = scrollRef.current;
    if (!node) return;
    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setCanScrollLeft(node.scrollLeft > 4);
    setCanScrollRight(maxScrollLeft > 4 && node.scrollLeft < maxScrollLeft - 4);
  };

  const scrollByPage = (direction: -1 | 1) => {
    const node = scrollRef.current;
    if (!node) return;
    const delta = direction * Math.min(node.clientWidth * 0.85, 280);
    node.scrollBy({ left: delta, behavior: 'smooth' });
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：pill 列表挂载、尺寸或条目变化后测量可否左右滚动。
   * 不可替代原因：需读取 DOM 的 scrollWidth / clientWidth / scrollLeft。
   * cleanup：断开 ResizeObserver。
   */
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    syncScrollEdges();
    const observer = new ResizeObserver(() => syncScrollEdges());
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <div
      className={styles.pillScrollStrip}
      data-scroll-fade-start={canScrollLeft ? 'true' : 'false'}
      data-scroll-fade-end={canScrollRight ? 'true' : 'false'}
    >
      <AppPressable
        className={styles.pillScrollPrev}
        aria-label="查看前面的示例"
        disabled={!canScrollLeft}
        onClick={() => scrollByPage(-1)}
      >
        <ChevronLeft aria-hidden />
      </AppPressable>
      <ul
        ref={scrollRef}
        className={styles.questionBubbleList}
        data-variant="pillScroll"
        data-align="start"
        role="list"
        onScroll={syncScrollEdges}
      >
        {items.map((item) => {
          const pick = () => onPick(item);

          return (
            <li key={item.id} className={styles.questionBubbleItem}>
              <QuestionPillButton item={item} variant="pillScroll" onPick={pick} />
            </li>
          );
        })}
      </ul>
      <AppPressable
        className={styles.pillScrollNext}
        aria-label="查看后面的示例"
        disabled={!canScrollRight}
        onClick={() => scrollByPage(1)}
      >
        <ChevronRight aria-hidden />
      </AppPressable>
    </div>
  );
}

function WelcomeQuestionsSection({ block, onPick }: WelcomeQuestionsSectionProps) {
  const titleId = useId();
  const variant = normalizeQuestionVariant(block.variant);
  const HeaderIcon = block.headerIcon;

  const scrollStrip =
    variant === 'pillScroll' ? (
      <PillScrollStrip
        items={block.items}
        onPick={(item) => onPick(item.prompt, { id: item.id, source: 'question' })}
      />
    ) : (
      <ul
        className={styles.questionBubbleList}
        data-variant={variant}
        data-align={block.align ?? (variant === 'pillWrap' ? 'center' : 'start')}
        role="list"
      >
        {block.items.map((item) => {
          const pick = () => onPick(item.prompt, { id: item.id, source: 'question' });

          return (
            <li key={item.id} className={styles.questionBubbleItem}>
              <QuestionPillButton item={item} variant={variant} onPick={pick} />
            </li>
          );
        })}
      </ul>
    );

  const body =
    block.shell === 'panel' ? (
      <div className={styles.questionPanel}>
        {(block.title || block.badge || HeaderIcon) && (
          <div className={styles.questionPanelHeader}>
            {HeaderIcon ? (
              <span className={styles.questionPanelHeaderIcon} aria-hidden>
                <HeaderIcon />
              </span>
            ) : null}
            {block.title ? (
              <h2 className={styles.questionPanelTitle} id={titleId}>
                {block.title}
              </h2>
            ) : null}
            {block.badge ? <span className={styles.questionPanelBadge}>{block.badge}</span> : null}
          </div>
        )}
        {scrollStrip}
      </div>
    ) : (
      <>
        {block.title ? (
          <h2 className={styles.sectionTitle} id={titleId}>
            {block.title}
          </h2>
        ) : null}
        {scrollStrip}
      </>
    );

  return (
    <section
      className={clsx(styles.section, styles.sectionReveal)}
      aria-labelledby={block.title ? titleId : undefined}
    >
      {body}
    </section>
  );
}

export default WelcomeQuestionsSection;
