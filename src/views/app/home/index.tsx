import { Button, Card, Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import nodeSvg from '@/assets/images/backgrounds/node.svg';
import polylineSvg from '@/assets/images/backgrounds/polyline-edit.svg';
import relationSvg from '@/assets/images/backgrounds/relation.svg';
import searchSvg from '@/assets/images/backgrounds/search.svg';
import styles from './style.module.less';

function Home() {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();

  return (
    <div className={styles.landingPage}>
      <section className={styles.hero} aria-labelledby="landing-hero-title">
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.heroEyebrow}>{t('home.eyebrow')}</span>
              <h1 id="landing-hero-title" className={styles.heroTitle}>
                WisePen
              </h1>
              <p className={styles.heroSubtitle}>{t('home.subtitle')}</p>
              <p className={styles.heroLead}>{t('home.lead')}</p>
              <div className={styles.heroActions}>
                <Button
                  variant="primary"
                  className={styles.heroCta}
                  onPress={() => navigate('/register')}
                >
                  {t('home.nav.register')}
                </Button>
                <Button className={styles.heroCta} onPress={() => navigate('/login')}>
                  {t('home.nav.login')}
                </Button>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.heroArtFloat}>
                <img src={searchSvg} alt="" className={styles.heroArtImg} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features} aria-labelledby="landing-features-title">
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <Chip size="sm" variant="soft" className={styles.sectionTag}>
              <Chip.Label>{t('home.capabilities')}</Chip.Label>
            </Chip>
            <h2 id="landing-features-title" className={styles.sectionTitle}>
              {t('home.modulesTitle')}
            </h2>
            <p className={styles.sectionLead}>{t('home.modulesLead')}</p>
          </header>

          <div className={styles.cardsGrid}>
            <Card className={styles.featureCard}>
              <div className={styles.cardCoverWrap}>
                <img alt="" src={nodeSvg} className={styles.cardCover} />
              </div>
              <Card.Content className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{t('home.writing.title')}</h3>
                <p className={styles.cardDescription}>{t('home.writing.description')}</p>
              </Card.Content>
            </Card>
            <Card className={styles.featureCard}>
              <div className={styles.cardCoverWrap}>
                <img alt="" src={relationSvg} className={styles.cardCover} />
              </div>
              <Card.Content className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{t('home.chat.title')}</h3>
                <p className={styles.cardDescription}>{t('home.chat.description')}</p>
              </Card.Content>
            </Card>
            <Card className={styles.featureCard}>
              <div className={styles.cardCoverWrap}>
                <img alt="" src={polylineSvg} className={styles.cardCover} />
              </div>
              <Card.Content className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{t('home.evaluation.title')}</h3>
                <p className={styles.cardDescription}>{t('home.evaluation.description')}</p>
              </Card.Content>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
