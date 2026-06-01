import {
  Card,
  Heading,
  Paragraph,
  Radio,
  RadioGroup,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from '@heroui/react';

import {
  COLOR_SCHEME_OPTIONS,
  THEME_MODE_OPTIONS,
  useColorScheme,
  type ColorScheme,
  type ColorSchemeOption,
  type ThemeMode,
} from '@/theme';

import layout from '../style.module.less';
import styles from './style.module.less';

type ThemeModeSectionProps = {
  value: string;
  onChange: (mode: ThemeMode) => void;
};

function ThemeModeSection({ value, onChange }: ThemeModeSectionProps) {
  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        明暗模式
      </Heading>
      <RadioGroup
        aria-label="明暗模式"
        className={styles.modeGroup}
        value={value}
        onChange={(next) => onChange(next as ThemeMode)}
      >
        {THEME_MODE_OPTIONS.map((option) => (
          <Radio key={option.id} value={option.id} className={styles.modeOption}>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Radio.Content className={styles.modeContent}>
              <span className={styles.modeLabel}>{option.label}</span>
              <Paragraph
                size="xs"
                color="muted"
                slot="description"
                className={styles.modeDescription}
              >
                {option.description}
              </Paragraph>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
    </section>
  );
}

type ColorSchemeSectionProps = {
  value: ColorScheme;
  onChange: (scheme: ColorScheme) => void;
};

function ColorSchemeSection({ value, onChange }: ColorSchemeSectionProps) {
  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        主题配色
      </Heading>
      <div className={styles.schemeGrid}>
        <ToggleButtonGroup
          aria-label="主题配色"
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

type SchemeOptionProps = {
  option: ColorSchemeOption;
};

function SchemeOption({ option }: SchemeOptionProps) {
  return (
    <ToggleButton id={option.id} data-scheme-preview={option.id} className={styles.schemeOption}>
      <span className={styles.schemePreview}>
        <span className={styles.schemeSwatch} />
        <span className={styles.schemeSwatch} />
      </span>
      <span className={styles.schemeLabel}>{option.label}</span>
      <span className={styles.schemeDescription}>{option.description}</span>
    </ToggleButton>
  );
}

function AppearanceHeader() {
  return (
    <header className={layout.pageHeader}>
      <Heading level={1} className={layout.pageTitle}>
        外观
      </Heading>
      <Paragraph size="sm" color="muted" className={layout.pageSubtitle}>
        设置明暗与主题
      </Paragraph>
    </header>
  );
}

function Appearance() {
  const { theme, setTheme } = useTheme();
  const { colorScheme, setColorScheme } = useColorScheme();

  return (
    <div className={layout.pageContainer}>
      <AppearanceHeader />
      <Card className={styles.panel}>
        <Card.Content className={styles.body}>
          <ThemeModeSection value={theme} onChange={setTheme} />
          <Separator className={styles.divider} />
          <ColorSchemeSection value={colorScheme} onChange={setColorScheme} />
        </Card.Content>
      </Card>
    </div>
  );
}

export default Appearance;
