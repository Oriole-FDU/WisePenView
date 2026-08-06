import { Fragment, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CountUp from './CountUp';
import DemoPlayer from './DemoPlayer';
import GlassBackdrop from './GlassBackdrop';
import Reveal from './Reveal';
import styles from './style.module.less';

/** 品牌三色块 logo（源设计 BrandMark） */
function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

/** 滚动到门户区块（SPA 内 .root 为滚动容器，需 scrollIntoView 而非 #hash） */
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function IconNote() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5h16v14H4z" />
      <path d="M4 9h16" />
      <path d="M8 13h6" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
    </svg>
  );
}

function IconText() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  );
}

function ProductIcon({ kind }: { kind: 'note' | 'chart' | 'text' }) {
  if (kind === 'note') return <IconNote />;
  if (kind === 'chart') return <IconChart />;
  return <IconText />;
}

function Home() {
  const { t } = useTranslation('shell');
  const navigate = useNavigate();

  // 装饰性玻璃螺旋背景带覆盖范围：AI 助手 → 常见问题（连续贯通，不被模块边界截断）
  const aiSectionRef = useRef<HTMLElement>(null);
  const faqSectionRef = useRef<HTMLElement>(null);

  const products = [
    {
      kind: 'note' as const,
      title: t('home.aiFeature.products.0.title'),
      text: t('home.aiFeature.products.0.text'),
    },
    {
      kind: 'chart' as const,
      title: t('home.aiFeature.products.1.title'),
      text: t('home.aiFeature.products.1.text'),
    },
    {
      kind: 'text' as const,
      title: t('home.aiFeature.products.2.title'),
      text: t('home.aiFeature.products.2.text'),
    },
  ];

  const outlineItems = [
    t('home.aiFeature.outline.0'),
    t('home.aiFeature.outline.1'),
    t('home.aiFeature.outline.2'),
    t('home.aiFeature.outline.3'),
  ];

  const formats = t('home.knowledgeFeature.formats', { returnObjects: true }) as string[];

  const files: { ext: string; name: string; meta: string; count?: number }[] = [
    {
      ext: 'PDF',
      name: t('home.knowledgeFeature.files.0.name'),
      meta: t('home.knowledgeFeature.files.0.meta'),
      count: 84,
    },
    {
      ext: 'Html',
      name: t('home.knowledgeFeature.files.1.name'),
      meta: t('home.knowledgeFeature.files.1.meta'),
    },
    {
      ext: 'DOC',
      name: t('home.knowledgeFeature.files.2.name'),
      meta: t('home.knowledgeFeature.files.2.meta'),
      count: 24,
    },
  ];

  const sources = t('home.knowledgeFeature.sources', { returnObjects: true }) as string[];

  const teamTags = t('home.teamFeature.tags', { returnObjects: true }) as string[];
  const members = t('home.teamFeature.members', { returnObjects: true }) as string[];

  const tasks = [
    {
      label: t('home.teamFeature.tasks.0.label'),
      doneCount: 12,
      totalCount: 12,
      text: t('home.teamFeature.tasks.0.text'),
      done: true,
    },
    {
      label: t('home.teamFeature.tasks.1.label'),
      doneCount: 6,
      totalCount: 8,
      text: t('home.teamFeature.tasks.1.text'),
      done: false,
    },
    {
      label: t('home.teamFeature.tasks.2.label'),
      doneCount: 3,
      totalCount: 10,
      text: t('home.teamFeature.tasks.2.text'),
      done: false,
    },
  ];

  const scenes = [
    {
      num: t('home.scenes.items.0.num'),
      title: t('home.scenes.items.0.title'),
      text: t('home.scenes.items.0.text'),
    },
    {
      num: t('home.scenes.items.1.num'),
      title: t('home.scenes.items.1.title'),
      text: t('home.scenes.items.1.text'),
    },
    {
      num: t('home.scenes.items.2.num'),
      title: t('home.scenes.items.2.title'),
      text: t('home.scenes.items.2.text'),
    },
  ];

  const faqs = [
    { q: t('home.faq.items.0.q'), a: t('home.faq.items.0.a') },
    { q: t('home.faq.items.1.q'), a: t('home.faq.items.1.a') },
    { q: t('home.faq.items.2.q'), a: t('home.faq.items.2.a') },
    { q: t('home.faq.items.3.q'), a: t('home.faq.items.3.a') },
    { q: t('home.faq.items.4.q'), a: t('home.faq.items.4.a') },
  ];

  const manifestoWords = t('home.manifesto.words', { returnObjects: true }) as string[];

  return (
    <main className={styles.page}>
      {/* 装饰性磨砂玻璃螺旋背景带（AI → FAQ 连续贯通，纯装饰不拦截交互） */}
      <GlassBackdrop fromRef={aiSectionRef} toRef={faqSectionRef} />
      {/* ── 首屏 ── */}
      <section className={styles.hero} id="top">
        <Reveal className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <i /> {t('home.hero.eyebrow')}
          </div>
          <h1>
            {t('home.hero.titleA')}
            <br />
            <em>{t('home.hero.titleB')}</em>
          </h1>
          <p>{t('home.hero.lead')}</p>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={() => scrollToSection('start')}
            >
              {t('home.hero.webCta')} <span aria-hidden="true">↗</span>
            </button>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={() => scrollToSection('ai')}
            >
              {t('home.hero.clientCta')} <span aria-hidden="true">↓</span>
            </button>
          </div>
        </Reveal>

        <Reveal className={styles.heroVisual} delay={120}>
          <div className={styles.orbOne} />
          <div className={styles.orbTwo} />
          <div className={styles.appWindow} data-demo="hero" data-step="0">
            <div className={styles.appBar}>
              <div className={styles.miniBrand}>
                <BrandMark />
                <b>WisePen</b>
              </div>
              <div className={styles.windowSearch}>
                {t('home.hero.searchPlaceholder')} <span>⌘ K</span>
              </div>
              <div className={styles.avatar}>W</div>
            </div>
            <div className={styles.appBody}>
              <aside className={styles.sidebar}>
                <div className={styles.newNote}>{t('home.hero.newNote')}</div>
                <p>{t('home.hero.mySpace')}</p>
                <div className={styles.sideItemActive}>
                  <span>▤</span> {t('home.hero.allNotes')}
                </div>
                <div className={styles.sideItem}>
                  <span>◇</span> {t('home.hero.aiChat')}
                </div>
                <div className={styles.sideItem}>
                  <span>▱</span> {t('home.hero.knowledgeBase')}
                </div>
                <p>{t('home.hero.recent')}</p>
                <div className={styles.folder}>
                  <i className={styles.folderBlue} /> {t('home.hero.folderCognitive')}
                </div>
                <div className={styles.folder}>
                  <i className={styles.folderOrange} /> {t('home.hero.folderCourses')}
                </div>
                <div className={styles.folder}>
                  <i className={styles.folderGreen} /> {t('home.hero.folderThesis')}
                </div>
              </aside>
              <article className={styles.editor}>
                <div className={styles.crumb}>{t('home.hero.crumb')}</div>
                <h2>{t('home.hero.noteTitle')}</h2>
                <div className={styles.meta}>
                  <span>{t('home.hero.noteType')}</span>
                  <span>{t('home.hero.noteTime')}</span>
                </div>
                <div className={styles.aiSummary}>
                  <div className={styles.spark}>✦</div>
                  <div>
                    <b>{t('home.hero.aiSummary')}</b>
                    <p>{t('home.hero.aiSummaryText')}</p>
                  </div>
                </div>
                <h3>{t('home.hero.coreConcepts')}</h3>
                <p className={styles.noteText}>{t('home.hero.noteText')}</p>
                <div className={styles.highlight}>{t('home.hero.highlightText')}</div>
                <div className={styles.noteLines}>
                  <span />
                  <span />
                  <span />
                </div>
              </article>
              <aside className={styles.aiPanel}>
                <div className={styles.aiHead}>
                  <span className={styles.sparkSmall}>✦</span>
                  <b>{t('home.hero.aiPanelTitle')}</b>
                  <span className={styles.dots} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className={styles.userBubble}>{t('home.hero.userBubble')}</div>
                <div className={styles.aiAnswer}>
                  <span className={styles.sparkTiny}>✦</span>
                  <div>
                    <p>{t('home.hero.aiAnswerLead')}</p>
                    <ol>
                      {[
                        t('home.hero.aiAnswerItems.0'),
                        t('home.hero.aiAnswerItems.1'),
                        t('home.hero.aiAnswerItems.2'),
                      ].map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                    <span className={styles.caret} aria-hidden="true" />
                  </div>
                </div>
                <div className={styles.chips}>
                  <span>{t('home.hero.chipMindmap')}</span>
                  <span>{t('home.hero.chipCards')}</span>
                </div>
                <div className={styles.prompt}>
                  {t('home.hero.promptPlaceholder')} <b>↑</b>
                </div>
              </aside>
            </div>
          </div>
          <div className={styles.tagLeft}>
            <span>✦</span>
            <b>
              <Trans ns="shell" i18nKey="home.hero.tagLeft">
                <CountUp to={8} />
              </Trans>
            </b>
          </div>
          <div className={styles.tagRight}>
            <i /> {t('home.hero.tagRight')}
          </div>
        </Reveal>
        <DemoPlayer target="hero" steps={[1400, 2200, 1600]} />
        <div className={styles.scrollNote}>
          <span /> {t('home.hero.scrollNote')}
        </div>
      </section>

      {/* ── 品牌宣言 ── */}
      <section className={styles.manifesto}>
        <Reveal>
          <p className={styles.sectionKicker}>{t('home.manifesto.kicker')}</p>
          <h2>
            {t('home.manifesto.titleA')}
            <br />
            {t('home.manifesto.titleB')}
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div className={styles.manifestoBottom}>
            <p>{t('home.manifesto.body')}</p>
            <div className={styles.threeWords}>
              {manifestoWords.map((word, i) => (
                <Fragment key={word}>
                  {i > 0 && <i />}
                  <span>{word}</span>
                </Fragment>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 特性 01 · AI 助手 ── */}
      <section className={styles.featureSection} id="ai" ref={aiSectionRef}>
        <div className={styles.featureGrid}>
          <Reveal className={styles.featureCopy}>
            <div className={styles.sectionNumber}>
              <span>01</span> {t('home.aiFeature.section')}
            </div>
            <h2>
              {t('home.aiFeature.titleA')}
              <br />
              {t('home.aiFeature.titleB')}
            </h2>
          </Reveal>

          <Reveal className={styles.aiDemo} delay={120} data-demo="ai" data-step="0">
            <div className={styles.promptCard}>
              <div className={styles.promptTop}>
                <span className={styles.spark}>✦</span>
                <span>{t('home.aiFeature.promptCardTag')}</span>
                <i />
              </div>
              <p>{t('home.aiFeature.promptCard')}</p>
              <div className={styles.promptActions}>
                <span>
                  <Trans ns="shell" i18nKey="home.aiFeature.promptCardMeta">
                    <CountUp to={12} />
                  </Trans>
                </span>
                <b>↑</b>
              </div>
            </div>
            <div className={styles.generatedCard}>
              <span className={`${styles.generationLabel} ${styles.genWriting}`}>
                {t('home.aiFeature.generatedWriting')}
              </span>
              <span className={`${styles.generationLabel} ${styles.genDone}`}>
                {t('home.aiFeature.generatedDone')}
              </span>
              <h3>{t('home.aiFeature.generatedTitle')}</h3>
              {outlineItems.map((item, i) => (
                <div className={styles.outlineItem} key={item}>
                  <b>0{i + 1}</b>
                  <span>{item}</span>
                </div>
              ))}
              <span className={styles.caret} aria-hidden="true" />
            </div>
          </Reveal>

          <DemoPlayer target="ai" steps={[1400, 2400, 1800]} />

          <div className={styles.productStrip}>
            {products.map((item) => (
              <div className={styles.productCard} key={item.title}>
                <span className={styles.productIcon}>
                  <ProductIcon kind={item.kind} />
                </span>
                <div>
                  <b>{item.title}</b>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 特性 02 · 个人知识库 ── */}
      <section className={styles.featureSectionKnowledge} id="knowledge">
        <div className={styles.featureGridReverse}>
          <Reveal className={styles.knowledgeDemo} delay={120} data-demo="knowledge" data-step="0">
            <div className={styles.libraryWindow}>
              <div className={styles.libraryTop}>
                <b>{t('home.knowledgeFeature.libTitle')}</b>
                <span>{t('home.knowledgeFeature.importBtn')}</span>
              </div>
              <div className={styles.fileGrid}>
                {files.map((file, i) => (
                  <div
                    className={i === 0 ? styles.fileCardSelected : styles.fileCard}
                    key={file.name}
                  >
                    <span className={styles.fileIcon}>{file.ext}</span>
                    <b>{file.name}</b>
                    <small>
                      {file.count != null ? (
                        <Trans ns="shell" i18nKey={`home.knowledgeFeature.files.${i}.meta`}>
                          <CountUp to={file.count} />
                        </Trans>
                      ) : (
                        file.meta
                      )}
                    </small>
                  </div>
                ))}
              </div>
              <div className={styles.askBar}>
                <span>✦</span>
                {t('home.knowledgeFeature.askPlaceholder')}
              </div>
            </div>
            <div className={styles.answerCard}>
              <div className={styles.answerHead}>
                <span className={styles.sparkSmall}>✦</span>
                <b>{t('home.knowledgeFeature.answerTitle')}</b>
              </div>
              <p>{t('home.knowledgeFeature.answerText')}</p>
              <div className={styles.sources}>
                {sources.map((source) => (
                  <span key={source}>{source}</span>
                ))}
              </div>
            </div>
          </Reveal>

          <DemoPlayer target="knowledge" steps={[1400, 1100, 2200]} />

          <Reveal className={styles.featureCopy}>
            <div className={styles.sectionNumber}>
              <span>02</span> {t('home.knowledgeFeature.section')}
            </div>
            <h2>
              {t('home.knowledgeFeature.titleA')}
              <br />
              {t('home.knowledgeFeature.titleB1')}
              <wbr />
              {t('home.knowledgeFeature.titleB2')}
            </h2>
            <p>{t('home.knowledgeFeature.lead')}</p>
            <div className={styles.formatRow}>
              {formats.map((format) => (
                <span key={format}>{format}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 特性 03 · 团队空间 ── */}
      <section className={styles.featureSectionTeam} id="team">
        <div className={styles.featureGrid}>
          <Reveal className={styles.featureCopy}>
            <div className={styles.sectionNumber}>
              <span>03</span> {t('home.teamFeature.section')}
            </div>
            <h2>
              {t('home.teamFeature.titleA')}
              <br />
              {t('home.teamFeature.titleB')}
            </h2>
            <p>{t('home.teamFeature.lead')}</p>
            <div className={styles.teamFeatures}>
              {teamTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </Reveal>

          <Reveal className={styles.teamDemo} delay={120} data-demo="team" data-step="0">
            <div className={styles.teamWindow}>
              <div className={styles.teamTop}>
                <div>
                  <span className={styles.teamIcon}>研</span>
                  <b>{t('home.teamFeature.teamName')}</b>
                </div>
                <div className={styles.memberStack}>
                  {members.map((member) => (
                    <i key={member}>{member}</i>
                  ))}
                </div>
              </div>
              <div className={styles.projectStatus}>
                <div>
                  <small>{t('home.teamFeature.projectLabel')}</small>
                  <b>{t('home.teamFeature.projectName')}</b>
                </div>
                <span>{t('home.teamFeature.status')}</span>
              </div>
              <div className={styles.progress}>
                <i />
              </div>
              <div className={styles.taskGrid}>
                {tasks.map((task, i) => (
                  <div key={task.label}>
                    <span>{task.label}</span>
                    <b>
                      <Trans
                        ns="shell"
                        i18nKey={`home.teamFeature.tasks.${i}.num`}
                        values={{ total: task.totalCount }}
                      >
                        <CountUp to={task.doneCount} />
                      </Trans>
                    </b>
                    <em className={task.done ? styles.taskDone : undefined}>{task.text}</em>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.activityCard}>
              <span className={styles.userDot}>周</span>
              <div>
                <b>{t('home.teamFeature.activity')}</b>
                <p>{t('home.teamFeature.activityText')}</p>
              </div>
              <small>{t('home.teamFeature.activityTime')}</small>
            </div>
            <div className={styles.classCard}>
              <span>✦</span>
              <div>
                <small>{t('home.teamFeature.classTitle')}</small>
                <b>
                  <Trans ns="shell" i18nKey="home.teamFeature.classText">
                    <CountUp to={128} />
                  </Trans>
                </b>
              </div>
            </div>
          </Reveal>

          <DemoPlayer target="team" steps={[2000, 1400, 1600]} />
        </div>
      </section>

      {/* ── 师生使用场景 ── */}
      <section className={styles.scenes} id="scenes">
        <Reveal className={styles.sceneHead}>
          <div>
            <p className={styles.sectionKicker}>{t('home.scenes.kicker')}</p>
            <h2>
              {t('home.scenes.titleA')}
              <wbr />
              {t('home.scenes.titleB')}
            </h2>
          </div>
        </Reveal>
        <div className={styles.sceneList}>
          {scenes.map((item, i) => (
            <Reveal key={item.num} delay={i * 80}>
              <article>
                <span>{item.num}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className={styles.arrow} aria-hidden="true">
                  ↗
                </span>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 常见问题 ── */}
      <section className={styles.faq} id="faq" ref={faqSectionRef}>
        <Reveal className={styles.faqHead}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>{t('home.faq.kicker')}</p>
            <h2>{t('home.faq.title')}</h2>
          </div>
        </Reveal>
        <div className={styles.faqList}>
          {faqs.map((item, i) => (
            <Reveal key={item.q} delay={i * 60}>
              <details>
                <summary>
                  {item.q}
                  <span className={styles.faqMark} aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 注册入口 ── */}
      <section className={styles.registerCta} id="start">
        <div className={styles.finalOrbOne} />
        <div className={styles.finalOrbTwo} />
        <div className={styles.registerContent}>
          <BrandMark />
          <p>{t('home.cta.kicker')}</p>
          <h2>
            {t('home.cta.titleA')}
            <br />
            {t('home.cta.titleB')}
          </h2>
          <p className={styles.registerSub}>{t('home.cta.sub')}</p>
          <button type="button" className={styles.buttonLime} onClick={() => navigate('/register')}>
            {t('home.cta.button')} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>
    </main>
  );
}

export default Home;
