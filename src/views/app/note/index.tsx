import { useRequest, useUnmount } from 'ahooks';
import { Alert, Result, Segmented, Spin } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { RiArrowLeftDoubleLine, RiMenuLine } from 'react-icons/ri';
import { Link, useParams } from 'react-router-dom';

import EntryIcon from '@/components/Common/EntryIcon';
import IconText from '@/components/Common/IconText';
import ResourceInteractFooter from '@/components/Common/ResourceInteractFooter';
import ResourceViewerHeader from '@/components/Common/ResourceViewerHeader';
import rvhStyles from '@/components/Common/ResourceViewerHeader/style.module.less';
import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type { NoteBodyEditorHandle } from '@/components/Note/CustomBlockNote/index.type';
import NoteInfoBar from '@/components/Note/NoteInfoBar';
import NoteOutline from '@/components/Note/NoteOutline';
import type { NoteOutlineItem } from '@/components/Note/NoteOutline/index.type';
import NoteTitle from '@/components/Note/NoteTitle';
import { useNoteService, useResourceService } from '@/domains';
import type { AiDiffDisplayMode, NoteInfoDisplayData } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE, AI_DIFF_DISPLAY_MODE_LABELS, useNoteSession } from '@/domains/Note';
import { RESOURCE_TYPE } from '@/domains/Resource';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import { useAiDiffDisplayStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import styles from './style.module.less';

interface NoteViewConnectedProps {
  noteId?: string;
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  onRefreshNoteInfo: () => void;
}

function NoteViewConnected({
  noteId,
  resourceId,
  noteInfoDisplay,
  onRefreshNoteInfo,
}: NoteViewConnectedProps) {
  const aiDiffDisplayMode = useAiDiffDisplayStore((state) => state.displayMode);
  const setAiDiffDisplayMode = useAiDiffDisplayStore((state) => state.setDisplayMode);
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [isReconnectLoading, setIsReconnectLoading] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [outlineItems, setOutlineItems] = useState<NoteOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(undefined);
  const { status, doc, provider, reconnect } = useNoteSession(resourceId);

  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting';
  const showFullPageSpin = status === 'connecting';

  const resourceService = useResourceService();
  const [displayLiked, setDisplayLiked] = useState<boolean | undefined>(undefined);
  const [displayLikeCount, setDisplayLikeCount] = useState<number | null | undefined>(undefined);
  const [displayUserScore, setDisplayUserScore] = useState<number | null | undefined>(undefined);

  const { run: runToggleLike, loading: likeLoading } = useRequest(
    () => resourceService.interactToggleLike({ resourceId }),
    {
      manual: true,
      onBefore: () => {
        const curLiked = displayLiked ?? noteInfoDisplay?.liked ?? false;
        const curLikeCount = displayLikeCount ?? noteInfoDisplay?.likeCount ?? 0;
        setDisplayLiked(!curLiked);
        setDisplayLikeCount(curLikeCount + (curLiked ? -1 : 1));
      },
      onSuccess: (res) => {
        setDisplayLiked(res.liked);
      },
      onError: (err) => {
        setDisplayLiked(noteInfoDisplay?.liked ?? false);
        setDisplayLikeCount(noteInfoDisplay?.likeCount ?? null);
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleToggleLike = useCallback(() => {
    runToggleLike();
  }, [runToggleLike]);

  const { run: runRate, loading: rateLoading } = useRequest(
    (score: number) => resourceService.interactRate({ resourceId, score }),
    {
      manual: true,
      onSuccess: (res) => {
        setDisplayUserScore(res.userScore);
        onRefreshNoteInfo();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const focusBody = useCallback(() => {
    bodyEditorRef.current?.focus();
  }, []);

  useUnmount(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  });

  const handleReconnect = useCallback(() => {
    reconnect();

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    setIsReconnectLoading(true);
    reconnectTimerRef.current = window.setTimeout(() => {
      setIsReconnectLoading(false);
      reconnectTimerRef.current = null;
    }, 2000);
  }, [reconnect]);

  const noteTitleText = noteInfoDisplay?.noteTitle?.trim() || '未命名笔记';
  const outlineItemsWithTitle: NoteOutlineItem[] = [
    { id: '__note_title__', level: 0, text: noteTitleText },
    ...outlineItems,
  ];

  const toolbarNoteTitle =
    noteInfoDisplay.noteTitle?.trim() && noteInfoDisplay.noteTitle.trim() !== '未命名笔记'
      ? noteInfoDisplay.noteTitle.trim()
      : '未命名笔记';
  const aiDiffDisplayOptions: Array<{ value: AiDiffDisplayMode; label: string }> = [
    {
      value: AI_DIFF_DISPLAY_MODE.OLD_ONLY,
      label: AI_DIFF_DISPLAY_MODE_LABELS[AI_DIFF_DISPLAY_MODE.OLD_ONLY],
    },
    {
      value: AI_DIFF_DISPLAY_MODE.NEW_ONLY,
      label: AI_DIFF_DISPLAY_MODE_LABELS[AI_DIFF_DISPLAY_MODE.NEW_ONLY],
    },
    {
      value: AI_DIFF_DISPLAY_MODE.COMPARE,
      label: AI_DIFF_DISPLAY_MODE_LABELS[AI_DIFF_DISPLAY_MODE.COMPARE],
    },
  ];

  return (
    <div className={styles.pageWrap}>
      <ResourceViewerHeader
        inlineTitle={
          <IconText
            className={rvhStyles.inlineTitleText}
            icon={<EntryIcon entryType="resource" resourceType={RESOURCE_TYPE.NOTE} />}
            iconSize={18}
            gap="var(--ant-margin-sm)"
            ellipsis
          >
            {toolbarNoteTitle}
          </IconText>
        }
        extra={
          <Segmented
            value={aiDiffDisplayMode}
            className={styles.aiDiffDisplayModeSwitch}
            options={aiDiffDisplayOptions}
            onChange={(value) => setAiDiffDisplayMode(value as AiDiffDisplayMode)}
          />
        }
      />
      <div className={styles.statesBelowHeader}>
        <div className={styles.mainScroll} ref={mainScrollRef}>
          <div className={styles.contentRow}>
            {isOutlineOpen ? (
              <aside className={styles.outlineAside} aria-label="文档目录侧栏">
                <div className={styles.outlineTopRow}>
                  <span className={styles.outlineTopTitle}>目录</span>
                  <button
                    type="button"
                    className={styles.outlineToggleBtn}
                    aria-label="收起目录"
                    onClick={() => setIsOutlineOpen(false)}
                  >
                    <RiArrowLeftDoubleLine size={20} />
                  </button>
                </div>
                <div className={styles.outlineScrollArea}>
                  <NoteOutline
                    items={outlineItemsWithTitle}
                    activeId={activeHeadingId}
                    onNavigate={(id) => {
                      if (id === '__note_title__') {
                        const anchor = titleAnchorRef.current;
                        if (anchor) {
                          anchor.scrollIntoView({ block: 'start', behavior: 'smooth' });
                          window.requestAnimationFrame(() => {
                            const editable = anchor.querySelector(
                              '[contenteditable="true"]'
                            ) as HTMLElement | null;
                            editable?.focus();
                          });
                        } else {
                          mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        return;
                      }
                      bodyEditorRef.current?.navigateToBlock(id);
                    }}
                  />
                </div>
              </aside>
            ) : (
              <div className={styles.outlineCollapsedCol} aria-label="展开目录">
                <button
                  type="button"
                  className={styles.outlineToggleBtn}
                  aria-label="展开目录"
                  onClick={() => setIsOutlineOpen(true)}
                >
                  <RiMenuLine size={20} />
                </button>
              </div>
            )}

            <div className={styles.mainCol}>
              <div className={styles.root}>
                {isDisconnected ? (
                  <Alert
                    className={styles.wsAlert}
                    type="warning"
                    description="网络连接已断开，当前可继续本地编辑；网络恢复后会自动同步到云端。"
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        isDisabled={isReconnectLoading}
                        onPress={handleReconnect}
                      >
                        重试
                      </Button>
                    }
                  />
                ) : null}
                <div ref={titleAnchorRef}>
                  <NoteTitle
                    key={`${resourceId}-${noteInfoDisplay?.noteTitle ?? ''}`}
                    id={noteId}
                    initialContent={noteInfoDisplay?.noteTitle}
                    focusOnMount={isConnected}
                    onEnterKey={focusBody}
                  />
                </div>
                <NoteInfoBar
                  noteInfoDisplay={noteInfoDisplay}
                  displayLikeCount={displayLikeCount}
                />
                <div className={styles.body}>
                  <CustomBlockNote
                    key={resourceId}
                    ref={bodyEditorRef}
                    resourceId={resourceId}
                    doc={doc}
                    provider={provider}
                    aiDiffDisplayMode={aiDiffDisplayMode}
                    readOnly={isEditorReadOnly}
                    onOutlineChange={setOutlineItems}
                    onActiveHeadingChange={setActiveHeadingId}
                  />
                </div>
                <ResourceInteractFooter
                  liked={displayLiked ?? noteInfoDisplay?.liked ?? false}
                  userScore={
                    displayUserScore !== undefined ? displayUserScore : noteInfoDisplay?.userScore
                  }
                  onToggleLike={handleToggleLike}
                  onRate={runRate}
                  likeLoading={likeLoading}
                  rateLoading={rateLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {showFullPageSpin ? (
          <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
            <div className={styles.middleOverlayLoading}>
              <Spin size="large" />
              <span className={styles.middleOverlayText}>正在连接笔记服务...</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NoteView() {
  const { noteId } = useParams<{ noteId?: string }>();
  const resourceId = noteId ?? '';
  const noteService = useNoteService();
  const {
    data: noteInfoDisplay,
    loading: isNoteInfoLoading,
    error: noteInfoError,
    refresh: refreshNoteInfo,
  } = useRequest(() => noteService.getNoteInfoDisplay({ resourceId }), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  if (!resourceId) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开笔记"
                extra={
                  <Link to="/app/drive">
                    <Button variant="secondary">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (noteInfoError) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开笔记"
                subTitle={parseErrorMessage(noteInfoError)}
                extra={
                  <Link to="/app/drive">
                    <Button variant="secondary">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isNoteInfoLoading && !noteInfoDisplay) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
            <div className={styles.middleOverlayLoading}>
              <Spin size="large" />
              <span className={styles.middleOverlayText}>正在加载笔记信息...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!noteInfoDisplay) {
    return (
      <div className={styles.pageWrap}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开笔记"
                subTitle="笔记信息为空，请稍后重试"
                extra={
                  <Link to="/app/drive">
                    <Button variant="secondary">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NoteViewConnected
      noteId={noteId}
      resourceId={resourceId}
      noteInfoDisplay={noteInfoDisplay}
      onRefreshNoteInfo={refreshNoteInfo}
    />
  );
}

export default NoteView;
