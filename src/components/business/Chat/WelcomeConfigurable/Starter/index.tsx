import { Card } from '@heroui/react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';

import { welcomeModeFromBlockCount } from '../_store/welcomeScreenState';
import type {
  WelcomeIconTone,
  WelcomePromptCardItem,
  WelcomePromptCardsBlock,
  WelcomeQuestionItem,
  WelcomeQuestionsBlock,
  WelcomeQuestionsVariant,
  WelcomeStarterBlock,
  WelcomeStarterProps,
} from './index.type';
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
    <button
      type="button"
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
    </button>
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
      <button
        type="button"
        className={styles.pillScrollPrev}
        aria-label="查看前面的示例"
        disabled={!canScrollLeft}
        onClick={() => scrollByPage(-1)}
      >
        <ChevronLeft aria-hidden />
      </button>
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
      <button
        type="button"
        className={styles.pillScrollNext}
        aria-label="查看后面的示例"
        disabled={!canScrollRight}
        onClick={() => scrollByPage(1)}
      >
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}

function WelcomeQuestionsSection({
  block,
  onPick,
}: {
  block: WelcomeQuestionsBlock;
  onPick: WelcomeStarterProps['onPromptPick'];
}) {
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

function FeatureIconOrb({
  icon: Icon,
  tone,
}: {
  icon: NonNullable<WelcomePromptCardItem['icon']>;
  tone: WelcomeIconTone | undefined;
}) {
  return (
    <span className={styles.featureIconOrb} data-tone={tone ?? 'violet'} aria-hidden>
      <Icon />
    </span>
  );
}

function WelcomePromptCardsSection({
  block,
  onPick,
}: {
  block: WelcomePromptCardsBlock;
  onPick: WelcomeStarterProps['onPromptPick'];
}) {
  const titleId = useId();
  const columns = block.columns ?? 2;
  const appearance = block.appearance ?? 'template';
  const showPromptPreview = block.showPromptPreview === true;

  return (
    <section
      className={clsx(styles.section, styles.sectionReveal)}
      aria-labelledby={block.title ? titleId : undefined}
    >
      {block.title ? (
        <h2 className={styles.sectionTitle} id={titleId}>
          {block.title}
        </h2>
      ) : null}
      <ul
        className={appearance === 'feature' ? styles.featureGrid : styles.cardGrid}
        data-columns={appearance === 'feature' ? String(columns) : String(columns)}
      >
        {block.items.map((item) => {
          const Icon = item.icon;
          const pick = () => onPick(item.prompt, { id: item.id, source: 'card' });

          if (appearance === 'feature') {
            return (
              <li key={item.id} className={styles.featureGridItem}>
                <button type="button" className={styles.featureTile} onClick={pick}>
                  {Icon ? <FeatureIconOrb icon={Icon} tone={item.iconTone} /> : null}
                  <span className={styles.featureTileBody}>
                    <span className={styles.featureTileTitle}>{item.title}</span>
                    {item.description ? (
                      <span className={styles.featureTileDescription}>{item.description}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.id} className={styles.cardGridItem}>
              <button type="button" className={styles.promptCardButton} onClick={pick}>
                <Card className={styles.promptCard}>
                  <Card.Header className={styles.cardHeader}>
                    {Icon ? (
                      <span className={styles.cardIcon} data-tone={item.iconTone} aria-hidden>
                        <Icon />
                      </span>
                    ) : null}
                    <Card.Title className={styles.cardTitle}>{item.title}</Card.Title>
                  </Card.Header>
                  {item.description ? (
                    <Card.Description className={styles.cardDescription}>
                      {item.description}
                    </Card.Description>
                  ) : null}
                  {showPromptPreview ? (
                    <Card.Content className={styles.cardContent}>
                      <p className={styles.cardPromptPreview}>{item.prompt}</p>
                    </Card.Content>
                  ) : null}
                </Card>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function renderBlock(block: WelcomeStarterBlock, onPick: WelcomeStarterProps['onPromptPick']) {
  if (block.type === 'questions') {
    return <WelcomeQuestionsSection key={block.id} block={block} onPick={onPick} />;
  }
  return <WelcomePromptCardsSection key={block.id} block={block} onPick={onPick} />;
}

function WelcomeStarter({
  config,
  onPromptPick,
  className,
  hero,
  layoutMode,
}: WelcomeStarterProps) {
  const regionLabelId = useId();
  const resolvedLayoutMode = layoutMode ?? welcomeModeFromBlockCount(config.blocks.length);
  const showHero = config.showHero !== false && hero != null;

  return (
    <div
      className={clsx(styles.root, className)}
      data-welcome-starters={resolvedLayoutMode}
      role="region"
      aria-labelledby={regionLabelId}
    >
      <span id={regionLabelId} className={styles.screenReaderOnly}>
        对话欢迎与示例提示
      </span>

      <div
        className={styles.scrollViewport}
        data-block-count={config.blocks.length > 3 ? 'many' : String(config.blocks.length)}
      >
        <div className={styles.scrollViewportContent}>
          {showHero ? <div className={styles.hero}>{hero}</div> : null}

          {config.blocks.length > 0 ? (
            <div className={styles.startersCluster}>
              {config.blocks.map((block) => renderBlock(block, onPromptPick))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default WelcomeStarter;
