import { clsx } from 'clsx';
import { useId } from 'react';

import { welcomeModeFromBlockCount } from '../welcomeMode';
import type { WelcomeStarterBlock, WelcomeStarterProps } from './index.type';
import WelcomePromptCardsSection from './PromptCards';
import WelcomeQuestionsSection from './Questions';
import styles from './style.module.scss';

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
