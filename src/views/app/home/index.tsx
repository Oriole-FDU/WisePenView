import { Button } from '@heroui/react';
import { Card, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import nodeSvg from '@/assets/images/backgrounds/node.svg';
import polylineSvg from '@/assets/images/backgrounds/polyline-edit.svg';
import relationSvg from '@/assets/images/backgrounds/relation.svg';
import searchSvg from '@/assets/images/backgrounds/search.svg';
import styles from './style.module.less';

const { Paragraph, Text } = Typography;

function Home() {
  const navigate = useNavigate();

  return (
    <div className={styles.landingPage}>
      <section className={styles.hero} aria-labelledby="landing-hero-title">
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.heroEyebrow}>学术英语 · AI 赋能</span>
              <h1 id="landing-hero-title" className={styles.heroTitle}>
                WisePen
              </h1>
              <p className={styles.heroSubtitle}>学术英语写作 AI + 教学平台</p>
              <Paragraph type="secondary" className={styles.heroLead}>
                专为高校教学与科研团队打造。集成智能写作辅助，AI
                Agent工作流与深度文稿评估，赋能师生智慧教学与应用。
              </Paragraph>
              <Space className={styles.heroActions} size="middle" wrap>
                <Button
                  variant="primary"
                  className={styles.heroCta}
                  onPress={() => navigate('/register')}
                >
                  注册
                </Button>
                <Button className={styles.heroCta} onPress={() => navigate('/login')}>
                  登录
                </Button>
              </Space>
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
            <Tag color="processing" className={styles.sectionTag}>
              产品能力
            </Tag>
            <h2 id="landing-features-title" className={styles.sectionTitle}>
              三大核心模块
            </h2>
            <Text type="secondary" className={styles.sectionLead}>
              从构思到成稿、从互动到反馈，覆盖学术写作关键链路；可按教学与课题组场景灵活组合使用。
            </Text>
          </header>

          <div className={styles.cardsGrid}>
            <Card
              className={styles.featureCard}
              variant="borderless"
              cover={
                <div className={styles.cardCoverWrap}>
                  <img alt="" src={nodeSvg} className={styles.cardCover} />
                </div>
              }
            >
              <Card.Meta
                title={<span className={styles.cardTitle}>论文写作</span>}
                description="结构化辅助与素材组织，贴合学术论文写作流程。"
              />
            </Card>
            <Card
              className={styles.featureCard}
              variant="borderless"
              cover={
                <div className={styles.cardCoverWrap}>
                  <img alt="" src={relationSvg} className={styles.cardCover} />
                </div>
              }
            >
              <Card.Meta
                title={<span className={styles.cardTitle}>AI 对话</span>}
                description="针对术语、句式与逻辑的多轮对话，即时澄清写作疑点。"
              />
            </Card>
            <Card
              className={styles.featureCard}
              variant="borderless"
              cover={
                <div className={styles.cardCoverWrap}>
                  <img alt="" src={polylineSvg} className={styles.cardCover} />
                </div>
              }
            >
              <Card.Meta
                title={<span className={styles.cardTitle}>写作质量评估</span>}
                description="从清晰度、一致性与学术规范等维度给出可操作的改进建议。"
              />
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
