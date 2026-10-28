import { Heading, Separator } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { AppToggleButton, AppToggleButtonGroup } from '@/components/base/Button';
import PageHeader from '@/components/base/PageHeader';
import { Tabs } from '@/components/base/Tabs';
import { changeAppLanguage } from '@/i18n';
import { LANGUAGE_OPTIONS } from '@/i18n/language';
import type { SupportedLanguage } from '@/i18n/resources';
import {
  COLOR_SCHEME_OPTIONS,
  type ColorScheme,
  type ColorSchemeOption,
  THEME_MODE_OPTIONS,
  type ThemeMode,
  useAppTheme,
  useColorScheme,
} from '@/theme';

import layout from '../style.module.scss';
import styles from './style.module.scss';

function LanguageSection() {
  const { i18n, t } = useTranslation('profile');
  const selectedLanguage: SupportedLanguage = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';

  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        {t('appearance.language')}
      </Heading>
      <Tabs
        className={styles.sectionTabs}
        selectedKey={selectedLanguage}
        onSelectionChange={(next) => void changeAppLanguage(String(next) as SupportedLanguage)}
      >
        <Tabs.ListContainer className={styles.sectionTabsListContainer}>
          <Tabs.List className={styles.sectionTabsList} aria-label={t('appearance.languageAria')}>
            {LANGUAGE_OPTIONS.map((option) => (
              <Tabs.Tab key={option.id} id={option.id} className={styles.sectionTab}>
                {t(option.labelKey, { ns: 'common' })}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </section>
  );
}

type ThemeModeSectionProps = {
  value: string;
  onChange: (mode: ThemeMode) => void;
};

function ThemeModeSection({ value, onChange }: ThemeModeSectionProps) {
  const { t } = useTranslation('profile');

  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        {t('appearance.mode')}
      </Heading>
      <Tabs
        className={styles.sectionTabs}
        selectedKey={value}
        onSelectionChange={(next) => onChange(String(next) as ThemeMode)}
      >
        <Tabs.ListContainer className={styles.sectionTabsListContainer}>
          <Tabs.List className={styles.sectionTabsList} aria-label={t('appearance.mode')}>
            {THEME_MODE_OPTIONS.map((option) => (
              <Tabs.Tab key={option.id} id={option.id} className={styles.sectionTab}>
                {t(option.labelKey)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </section>
  );
}

type ColorSchemeSectionProps = {
  value: ColorScheme;
  onChange: (scheme: ColorScheme) => void;
};

function ColorSchemeSection({ value, onChange }: ColorSchemeSectionProps) {
  const { t } = useTranslation('profile');

  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        {t('appearance.colorScheme')}
      </Heading>
      <div className={styles.schemeGrid}>
        <AppToggleButtonGroup
          aria-label={t('appearance.colorScheme')}
          selectionMode="single"
          selectedKeys={new Set([value])}
          onSelectionChange={(keys) => {
            const [key] = [...keys];
            if (key != null) onChange(String(key) as ColorScheme);
          }}
          className={styles.schemeGroup}
          orientation="horizontal"
          isDetached
        >
          {COLOR_SCHEME_OPTIONS.map((option) => (
            <SchemeOption key={option.id} option={option} />
          ))}
        </AppToggleButtonGroup>
      </div>
    </section>
  );
}

type SchemeOptionProps = {
  option: ColorSchemeOption;
};

function SchemeOption({ option }: SchemeOptionProps) {
  const { t } = useTranslation('profile');

  return (
    <AppToggleButton id={option.id} data-scheme-preview={option.id} className={styles.schemeOption}>
      <span className={styles.schemePreview}>
        <span className={styles.schemeSwatch} />
        <span className={styles.schemeSwatch} />
        <span className={styles.schemeSwatch} />
      </span>
      <span className={styles.schemeLabel}>{t(option.labelKey)}</span>
      <span className={styles.schemeDescription}>{t(option.descriptionKey)}</span>
    </AppToggleButton>
  );
}

function AppearanceHeader() {
  const { t } = useTranslation('profile');

  return <PageHeader title={t('appearance.title')} subtitle={t('appearance.subtitle')} />;
}

function Appearance() {
  const { theme, setTheme } = useAppTheme();
  const { colorScheme, setColorScheme } = useColorScheme();

  return (
    <>
      <AppearanceHeader />
      <div className={styles.body}>
        <LanguageSection />
        <Separator className={styles.divider} />
        <ThemeModeSection value={theme} onChange={setTheme} />
        <Separator className={styles.divider} />
        <ColorSchemeSection value={colorScheme} onChange={setColorScheme} />
      </div>
    </>
  );
}

export default Appearance;
