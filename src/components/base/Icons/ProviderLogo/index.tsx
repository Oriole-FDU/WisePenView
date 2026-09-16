import claudeIcon from '@lobehub/icons-static-svg/icons/claude.svg?raw';
import deepSeekIcon from '@lobehub/icons-static-svg/icons/deepseek.svg?raw';
import doubaoIcon from '@lobehub/icons-static-svg/icons/doubao.svg?raw';
import geminiIcon from '@lobehub/icons-static-svg/icons/gemini.svg?raw';
import grokIcon from '@lobehub/icons-static-svg/icons/grok.svg?raw';
import metaIcon from '@lobehub/icons-static-svg/icons/meta.svg?raw';
import mistralIcon from '@lobehub/icons-static-svg/icons/mistral.svg?raw';
import openAiIcon from '@lobehub/icons-static-svg/icons/openai.svg?raw';
import qwenIcon from '@lobehub/icons-static-svg/icons/qwen.svg?raw';
import type { CSSProperties } from 'react';

import { cn } from '@/utils/cn';

import type { ProviderLogoProps } from './index.type';
import styles from './style.module.less';

const PROVIDER_ICON_MAP: Record<string, string> = {
  anthropic: claudeIcon,
  claude: claudeIcon,
  deepseek: deepSeekIcon,
  doubao: doubaoIcon,
  gemini: geminiIcon,
  google: geminiIcon,
  grok: grokIcon,
  meta: metaIcon,
  mistral: mistralIcon,
  openai: openAiIcon,
  qwen: qwenIcon,
};

function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase();
}

function ProviderLogo({ provider, size = 16, className }: ProviderLogoProps) {
  const iconSvg = PROVIDER_ICON_MAP[normalizeProvider(provider)] ?? openAiIcon;
  const logoStyle = {
    width: size,
    height: size,
    fontSize: size,
  } satisfies CSSProperties;

  return (
    <span
      className={cn(styles.logo, className)}
      aria-hidden="true"
      style={logoStyle}
      dangerouslySetInnerHTML={{ __html: iconSvg }}
    />
  );
}

export default ProviderLogo;
