import type { StoreApi } from 'zustand/vanilla';

import { useChatInputStoreApi } from '../../ChatConversation/ChatInput/_context';
import type { ChatInputStoreState } from '../../ChatConversation/ChatInput/_context/ChatInputStore';
import { useWelcomeScreenOrchestration, useWelcomeScreenStore } from '../_store/welcomeScreenState';
import WelcomeStarter from '../Starter';
import type { WelcomePromptPickMeta } from '../Starter/index.type';
import WelcomeTitle from '../Title';
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

interface WelcomeScreenHostBodyProps extends WelcomeScreenHostProps {
  chatInputStore: StoreApi<ChatInputStoreState> | null;
}

function WelcomeScreenHostBody({
  config,
  syncLayoutWithShell = false,
  hero,
  chatInputStore,
  onPromptPick,
}: WelcomeScreenHostBodyProps) {
  const layoutMode = useWelcomeScreenStore((state) => state.welcomeMode);

  useWelcomeScreenOrchestration(syncLayoutWithShell ? config : null);

  const showHero = config.showHero !== false;
  const heroNode = resolveHero(hero, showHero, config.hero);

  const handlePromptPick = (prompt: string, meta: WelcomePromptPickMeta) => {
    if (chatInputStore) {
      chatInputStore.getState().setValue(prompt);
    }
    onPromptPick?.(prompt, meta);
  };

  return (
    <WelcomeStarter
      config={config}
      layoutMode={syncLayoutWithShell ? layoutMode : undefined}
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
 * Welcome 屏装配：Title + Starter + 可选壳层 layout 同步 + Chat 输入预填。
 * 不同场景传入不同 config 即可复用；纯 blocks 也可用 WelcomeStarter。
 */
function WelcomeScreenHost(props: WelcomeScreenHostProps) {
  if (props.prefillChatInput === false) {
    return <WelcomeScreenHostBody {...props} chatInputStore={null} />;
  }
  return <WelcomeScreenHostWithInputPrefill {...props} />;
}

export default WelcomeScreenHost;
