import popupStyles from '@/components/ChatPanel/popupSurface.module.less';
import { EmptyState } from '@/components/Common/Feedback';
import type { CapabilityPickerItem } from '@/domains/Chat/mapper/capabilityPicker.mapper';
import { Check, Wrench } from 'lucide-react';
import chatInputStyles from '../style.module.less';
import type { CapabilityPickerProps } from './index.type';
import styles from './style.module.less';

function CapabilityPicker({ open, sections, onItemPress, onMenuInteract }: CapabilityPickerProps) {
  if (!open) return null;

  const hasAnyItems = sections.some((section) => section.items.length > 0);
  if (!hasAnyItems) {
    return (
      <div className={`${styles.panel} ${popupStyles.surface}`}>
        <div className={styles.empty}>
          <EmptyState title="暂无可用能力" />
        </div>
      </div>
    );
  }

  const handleClick = (item: CapabilityPickerItem) => {
    onMenuInteract?.();
    onItemPress(item);
  };

  const sectionElements: React.ReactNode[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.items.length === 0) continue;

    if (sectionElements.length > 0) {
      sectionElements.push(<div key={`divider-${section.key}`} className={styles.divider} />);
    }

    sectionElements.push(
      <div key={section.key} className={`${styles.menu} ${popupStyles.menu}`}>
        {section.items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={popupStyles.menuButton}
            onClick={() => handleClick(item)}
          >
            {item.kind === 'tool' ? <Wrench size={16} /> : null}
            <span className={`${chatInputStyles.menuItemRow} ${popupStyles.menuLabel}`}>
              <span>
                {item.label}
                {item.sourceText ? (
                  <span className={chatInputStyles.capabilitySourceText}>{item.sourceText}</span>
                ) : null}
              </span>
              {item.checked ? (
                <span className={chatInputStyles.capabilityCheck}>
                  <Check size={16} />
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return <div className={`${styles.panel} ${popupStyles.surface}`}>{sectionElements}</div>;
}

export default CapabilityPicker;
