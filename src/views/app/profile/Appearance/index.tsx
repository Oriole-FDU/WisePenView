import {
  Heading,
  Paragraph,
  Separator,
  Switch,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import { useTranslation } from 'react-i18next';

import PageHeader from '@/components/business/PageHeader';
import { changeAppLanguage } from '@/i18n';
import { LANGUAGE_OPTIONS } from '@/i18n/language';
import type { SupportedLanguage } from '@/i18n/resources';
import {
  COLOR_SCHEME_OPTIONS,
  type ColorScheme,
  type ColorSchemeOption,
  THEME_MODE_OPTIONS,
  type ThemeMode,
  useAccentNeutralized,
  useAppTheme,
  useColorScheme,
} from '@/theme';

import layout from '../style.module.less';
import styles from './style.module.less';

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
        <ToggleButtonGroup
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
        </ToggleButtonGroup>
      </div>
    </section>
  );
}

function ReadingModeSection() {
  const { t } = useTranslation('profile');
  const { isAccentNeutralized, setAccentNeutralized } = useAccentNeutralized();

  return (
    <section className={styles.section}>
      <div className={styles.switchRow}>
        <div className={styles.switchCopy}>
          <Heading level={3} className={layout.sectionTitle}>
            {t('appearance.readingMode.title')}
          </Heading>
          <Paragraph size="sm" color="muted" className={styles.switchDescription}>
            {t('appearance.readingMode.description')}
          </Paragraph>
        </div>
        <Switch
          size="md"
          aria-label={t('appearance.readingMode.title')}
          isSelected={isAccentNeutralized}
          onChange={setAccentNeutralized}
        >
          <Switch.Content className={styles.switchContent}>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
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
    <ToggleButton id={option.id} data-scheme-preview={option.id} className={styles.schemeOption}>
      <span className={styles.schemePreview}>
        <span className={styles.schemeSwatch} />
        <span className={styles.schemeSwatch} />
        <span className={styles.schemeSwatch} />
      </span>
      <span className={styles.schemeLabel}>{t(option.labelKey)}</span>
      <span className={styles.schemeDescription}>{t(option.descriptionKey)}</span>
    </ToggleButton>
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
        <Separator className={styles.divider} />
        <ReadingModeSection />
      </div>
    </>
  );
}

export default Appearance;
