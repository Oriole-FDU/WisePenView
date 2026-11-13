import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import { AppPressable } from '@/components/base/Button';
import type { AgentSpec } from '@/domains/Agent';
import type { ChatModel, ToolOption } from '@/domains/ChatConfig';

import CapabilityOverridesSection from '../CapabilitiesSection/CapabilityOverridesSection';
import MemorySection from '../MemorySection';
import ModelSection from '../ModelSection';
import styles from './style.module.scss';

interface Props {
  spec: AgentSpec;
  models: ChatModel[];
  tools: ToolOption[];
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}

export default function AdvancedSettingsSection({
  spec,
  models,
  tools,
  disabled,
  onChange,
}: Props) {
  const { t } = useTranslation('agent');
  const [expanded, setExpanded] = useState(false);
  const contentId = 'agent-advanced-settings';
  const title = (
    <AppPressable
      className={styles.titleTrigger}
      aria-expanded={expanded}
      aria-controls={contentId}
      onClick={() => setExpanded((value) => !value)}
    >
      <span>{t('advanced.title')}</span>
      <ChevronRight size={16} aria-hidden="true" className={styles.indicator} />
    </AppPressable>
  );

  return (
    <AppForm.Section id="advanced" title={title} variant="editor">
      {expanded ? (
        <div id={contentId} className={styles.content}>
          <section className={styles.group}>
            <h3>{t('model.title')}</h3>
            <ModelSection spec={spec} models={models} disabled={disabled} onChange={onChange} />
          </section>
          <section className={styles.group}>
            <h3>{t('capabilities.advancedTitle')}</h3>
            <CapabilityOverridesSection
              spec={spec}
              tools={tools}
              disabled={disabled}
              onChange={onChange}
            />
          </section>
          <section className={styles.group}>
            <h3>{t('memory.title')}</h3>
            <MemorySection spec={spec} disabled={disabled} onChange={onChange} />
          </section>
        </div>
      ) : null}
    </AppForm.Section>
  );
}
