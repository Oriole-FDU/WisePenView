import WelcomeStarter from '../Starter';
import type { WelcomePromptPickMeta } from '../Starter/index.type';
import WelcomeTitle from '../Title';
import { welcomeModeFromBlockCount } from '../welcomeMode';
import type { WelcomeScreenHostProps } from './index.type';

function resolveHero(
  hero: WelcomeScreenHostProps['hero'],
  showHero: boolean,
  heroConfig: WelcomeScreenHostProps['config']['hero']
) {
  if (!showHero) {
    return undefined;
  }
  if (hero === null) {
    return undefined;
  }
  if (hero !== undefined) {
    return hero;
  }
  return <WelcomeTitle {...heroConfig} />;
}

/**
 * Welcome 屏：读 config 渲染 Title + Starter。
 * 不感知 ChatInput；点选仅通过 onPromptPick 上抛。
 */
function WelcomeScreenHost({ config, hero, onPromptPick }: WelcomeScreenHostProps) {
  const showHero = config.showHero !== false;
  const heroNode = resolveHero(hero, showHero, config.hero);
  const layoutMode = welcomeModeFromBlockCount(config.blocks.length);

  const handlePromptPick = (prompt: string, meta: WelcomePromptPickMeta) => {
    onPromptPick?.(prompt, meta);
  };

  return (
    <WelcomeStarter
      config={config}
      layoutMode={layoutMode}
      hero={heroNode}
      onPromptPick={handlePromptPick}
    />
  );
}

export default WelcomeScreenHost;
