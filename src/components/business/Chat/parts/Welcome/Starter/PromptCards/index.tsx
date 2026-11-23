import { Card } from '@heroui/react';
import { clsx } from 'clsx';
import { useId } from 'react';

import { AppPressable } from '@/components/base/Button';

import type { WelcomeIconTone, WelcomePromptCardItem } from '../index.type';
import type { WelcomePromptCardsSectionProps } from './index.type';
import styles from './style.module.scss';

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

function WelcomePromptCardsSection({ block, onPick }: WelcomePromptCardsSectionProps) {
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
        data-columns={String(columns)}
      >
        {block.items.map((item) => {
          const Icon = item.icon;
          const pick = () => onPick(item.prompt, { id: item.id, source: 'card' });

          if (appearance === 'feature') {
            return (
              <li key={item.id} className={styles.featureGridItem}>
                <AppPressable className={styles.featureTile} onClick={pick}>
                  {Icon ? <FeatureIconOrb icon={Icon} tone={item.iconTone} /> : null}
                  <span className={styles.featureTileBody}>
                    <span className={styles.featureTileTitle}>{item.title}</span>
                    {item.description ? (
                      <span className={styles.featureTileDescription}>{item.description}</span>
                    ) : null}
                  </span>
                </AppPressable>
              </li>
            );
          }

          return (
            <li key={item.id} className={styles.cardGridItem}>
              <AppPressable className={styles.promptCardButton} onClick={pick}>
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
              </AppPressable>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default WelcomePromptCardsSection;
