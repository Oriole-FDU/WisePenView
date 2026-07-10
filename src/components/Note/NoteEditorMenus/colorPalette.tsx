import { Button, ColorSwatchPicker } from '@heroui/react';
import clsx from 'clsx';
import { Baseline } from 'lucide-react';
import {
  colorItems,
  findColorItemByPickerValue,
  getColorItem,
  type ColorKey,
} from './colorPaletteData';
import styles from './style.module.less';

interface ColorPaletteSectionConfig {
  color?: string;
  onChange: (color: ColorKey) => void;
}

interface ColorPaletteContentProps {
  text?: ColorPaletteSectionConfig;
  background?: ColorPaletteSectionConfig;
  onReset?: () => void;
  className?: string;
}

function ColorSection({
  title,
  selectedColor,
  mode,
  onSelect,
}: {
  title: string;
  selectedColor?: string;
  mode: 'text' | 'background';
  onSelect: (color: ColorKey) => void;
}) {
  const selectedItem = getColorItem(selectedColor);

  return (
    <div className={styles.colorSection}>
      <div className={styles.colorSectionTitle}>{title}</div>
      <ColorSwatchPicker
        aria-label={title}
        className={styles.colorSwatchPicker}
        layout="grid"
        value={selectedItem.value}
        onChange={(color) => {
          const item = findColorItemByPickerValue(color.toString('hex'));
          if (item) {
            onSelect(item.key);
          }
        }}
      >
        {colorItems.map((item) => (
          <ColorSwatchPicker.Item
            key={`${mode}-${item.key}`}
            color={item.value}
            aria-label={`${title}${item.label}`}
            className={({ isSelected }) =>
              clsx(styles.colorSwatchItem, isSelected && styles.colorSwatchSelected)
            }
            onPress={() => onSelect(item.key)}
          >
            {mode === 'text' ? (
              <Baseline
                size={20}
                className={clsx(styles.colorTextPreview, item.textClassName)}
                aria-hidden="true"
              />
            ) : (
              <span className={clsx(styles.colorBackgroundPreview, item.backgroundClassName)} />
            )}
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
    </div>
  );
}

export function ColorPaletteContent({
  text,
  background,
  onReset,
  className,
}: ColorPaletteContentProps) {
  return (
    <div className={clsx(styles.colorPanel, className)}>
      {text ? (
        <ColorSection
          title="字体颜色"
          selectedColor={text.color}
          mode="text"
          onSelect={text.onChange}
        />
      ) : null}
      {background ? (
        <ColorSection
          title="背景颜色"
          selectedColor={background.color}
          mode="background"
          onSelect={background.onChange}
        />
      ) : null}
      {onReset ? (
        <Button variant="outline" size="sm" className={styles.resetColorButton} onPress={onReset}>
          恢复默认
        </Button>
      ) : null}
    </div>
  );
}
