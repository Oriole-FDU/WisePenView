import { useChatInputStoreApi } from '../../ChatConversation/ChatInput/_context';
import WelcomeStarter from '../Starter';
import type { WelcomePromptPickMeta } from '../Starter/index.type';
import WelcomeTitle from '../Title';
import { welcomeModeFromBlockCount } from '../welcomeMode';
import type { WelcomeScreenHostBodyProps, WelcomeScreenHostProps } from './index.type';

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

function WelcomeScreenHostBody({
  config,
  hero,
  chatInputStore,
  onPromptPick,
}: WelcomeScreenHostBodyProps) {
  const showHero = config.showHero !== false;
  const heroNode = resolveHero(hero, showHero, config.hero);
  const layoutMode = welcomeModeFromBlockCount(config.blocks.length);

  const handlePromptPick = (prompt: string, meta: WelcomePromptPickMeta) => {
    if (chatInputStore) {
      chatInputStore.getState().setValue(prompt);
    }
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

function WelcomeScreenHostWithInputPrefill(props: WelcomeScreenHostProps) {
  const chatInputStore = useChatInputStoreApi();
  return <WelcomeScreenHostBody {...props} chatInputStore={chatInputStore} />;
}

/**
 * Welcome 屏：读 config 渲染 Title + Starter；点选可预填 Chat 输入框。
 */
function WelcomeScreenHost(props: WelcomeScreenHostProps) {
  if (props.prefillChatInput === false) {
    return <WelcomeScreenHostBody {...props} chatInputStore={null} />;
  }
  return <WelcomeScreenHostWithInputPrefill {...props} />;
}

export default WelcomeScreenHost;
