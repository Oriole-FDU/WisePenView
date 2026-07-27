import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { useTranslation } from 'react-i18next';
import type { ContractModalProps } from './index.type';
import styles from './style.module.less';

interface AgreementClause {
  text: string;
  items?: string[];
}

interface AgreementSection {
  title: string;
  clauses: AgreementClause[];
}

function ServiceAgreement({ isOpen, onOpenChange }: ContractModalProps) {
  const { t } = useTranslation('auth');
  const sections = t('agreement.sections', {
    returnObjects: true,
  }) as AgreementSection[];

  return (
    <AppDisplayDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('agreement.title')}
      size="lg"
      closeText={t('agreement.close')}
    >
      <div className={styles.modalContent}>
        {sections.map((section) => (
          <section className={styles.section} key={section.title}>
            <h3 className={styles.sectionTitle}>{section.title}</h3>
            <ol className={styles.clauseList}>
              {section.clauses.map((clause, clauseIndex) => (
                <li key={clauseIndex}>
                  <span>{clause.text}</span>
                  {clause.items && (
                    <ol className={styles.subclauseList}>
                      {clause.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </AppDisplayDialog>
  );
}

export default ServiceAgreement;
