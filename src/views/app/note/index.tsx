import { useRequest, useUnmount } from 'ahooks';
import { Alert, Result, Segmented, Spin } from 'antd';
import { ChevronsLeft, Menu, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EntryIcon from '@/components/Common/EntryIcon';
import IconText from '@/components/Common/IconText';
import CustomBlockNote from '@/components/Note/CustomBlockNote';
import { useCommentSettingsSync } from '@/components/Note/CustomBlockNote/comments';
import type { NoteBodyEditorHandle } from '@/components/Note/CustomBlockNote/index.type';
import NoteOutline from '@/components/Note/NoteOutline';
import {
  NOTE_OUTLINE_TITLE_ID,
  type NoteOutlineItem,
} from '@/components/Note/NoteOutline/index.type';
import ResourceInteractFooter from '@/components/Resource/ResourceInteractFooter';
import ResourceViewerHeader from '@/components/Resource/ResourceViewerHeader';
import rvhStyles from '@/components/Resource/ResourceViewerHeader/style.module.less';
import { useNoteService, useResourceService, useUserService } from '@/domains';
import type { AiDiffDisplayMode, NoteInfoDisplayData } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE, AI_DIFF_DISPLAY_MODE_LABELS, useNoteSession } from '@/domains/Note';
import { RESOURCE_TYPE } from '@/domains/Resource';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import { useAiDiffDisplayStore } from '@/store';
import { useNoteCommentsSidebarStore } from '@/store/useNoteCommentsSidebarStore';
import { parseErrorMessage } from '@/utils/error';
import { Button, Checkbox, Dropdown, Modal, Switch, Tooltip, toast } from '@heroui/react';
import NoteInfoBar from './_components/NoteInfoBar';
import NotePermissionModal from './_components/NotePermissionModal';
import NoteTitle from './_components/NoteTitle';
import type { NoteTitleHandle } from './_components/NoteTitle/index.type';
import styles from './style.module.less';

interface NoteViewConnectedProps {
  noteId?: string;
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  onRefreshNoteInfo: () => void;
}

interface NoteToolbarTitleProps {
  resourceId: string;
  fallbackTitle?: string;
}

function NoteToolbarTitle({ resourceId, fallbackTitle }: NoteToolbarTitleProps) {
  const title = useResourceDisplayName(resourceId, fallbackTitle, '未命名笔记');

  return (
    <IconText
      className={rvhStyles.inlineTitleText}
      icon={<EntryIcon entryType="resource" resourceType={RESOURCE_TYPE.NOTE} />}
      iconSize={18}
      gap="var(--ant-margin-sm)"
      ellipsis
    >
      {title}
    </IconText>
  );
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
  const titleEditorRef = useRef<NoteTitleHandle>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [isReconnectLoading, setIsReconnectLoading] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isCommentHistoryOpen, setIsCommentHistoryOpen] = useState(false);
  const [outlineItems, setOutlineItems] = useState<NoteOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(undefined);
  const [pdfExportLoading, setPdfExportLoading] = useState(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [pdfIncludeComments, setPdfIncludeComments] = useState(false);
  const [isDownloadingMarkdown, setIsDownloadingMarkdown] = useState(false);
  const [aiDiffPresence, setAiDiffPresence] = useState<{
    resourceId: string;
    hasAiDiffContent: boolean;
  }>({
    resourceId,
    hasAiDiffContent: false,
  });
  const { status, doc, provider, reconnect, idbSynced } = useNoteSession(resourceId);
  const threadsSidebarCollapsed = useNoteCommentsSidebarStore(
    (state) => state.collapsedByResourceId[resourceId] ?? false
  );
  const toggleNoteCommentsSidebar = useNoteCommentsSidebarStore(
    (state) => state.toggleNoteCommentsSidebarCollapsed
  );
  const commentsSidebarWidth = useNoteCommentsSidebarStore((state) =>
    state.getNoteCommentsSidebarWidth(resourceId)
  );
  const setNoteCommentsSidebarWidth = useNoteCommentsSidebarStore(
    (state) => state.setNoteCommentsSidebarWidth
  );
  const { settings: commentSettings, setCollaboratorVisibility } = useCommentSettingsSync(
    status === 'connected' ? doc : null
  );

  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting' || !noteInfoDisplay.canCollaborativeEdit;
  const isTitleReadOnly = !noteInfoDisplay.canCollaborativeEdit;
  const blockLocalDocWrites = isConnected && !noteInfoDisplay.canCollaborativeEdit;
  // IndexedDB 就绪或 WebSocket 已连通即可进入编辑；避免仅因 Yjs sync 未完成而一直遮罩
  const showFullPageSpin = status === 'connecting' && !idbSynced;

  const userService = useUserService();
  const resourceService = useResourceService();
  const { data: currentUser } = useRequest(() => userService.getUserInfo(), {
    ready: Boolean(noteInfoDisplay.ownerId),
    refreshDeps: [noteInfoDisplay.ownerId],
  });

  // 进入页面时上报阅读
  useRequest(() => resourceService.interactRead(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const focusBody = () => {
    bodyEditorRef.current?.focus();
  };

  useUnmount(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  });

  const handleReconnect = () => {
    reconnect();

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    setIsReconnectLoading(true);
    reconnectTimerRef.current = window.setTimeout(() => {
      setIsReconnectLoading(false);
      reconnectTimerRef.current = null;
    }, 2000);
  };

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
  const showAiDiffDisplayModeSwitch =
    aiDiffPresence.resourceId === resourceId && aiDiffPresence.hasAiDiffContent;

  const handleAiDiffPresenceChange = (hasAiDiffContent: boolean) => {
    setAiDiffPresence({ resourceId, hasAiDiffContent });
  };

  const handlePrintPdf = async (includeComments: boolean) => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info('编辑器未就绪');
      return;
    }
    const titleApi = titleEditorRef.current;
    const title = titleApi?.getPlainTitle() ?? noteInfoDisplay?.noteTitle ?? '未命名笔记';
    const titleRoot = titleApi?.getProseMirrorRoot() ?? null;
    try {
      setPdfExportLoading(true);
      await bodyApi.exportPdf({ title, titleRoot, includeComments });
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setPdfExportLoading(false);
      setIsPdfExportModalOpen(false);
    }
  };

  const handleDownloadMarkdown = async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info('编辑器未就绪');
      return;
    }
    try {
      setIsDownloadingMarkdown(true);
      const title =
        titleEditorRef.current?.getPlainTitle() ?? noteInfoDisplay?.noteTitle ?? '未命名笔记';
      await bodyApi.downloadMarkdown(title);
      toast.success('Markdown 下载已开始');
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setIsDownloadingMarkdown(false);
    }
  };

  const headerMorePending = pdfExportLoading || isDownloadingMarkdown;
  const canManageNotePermission =
    Boolean(noteInfoDisplay.ownerId) && currentUser?.id === noteInfoDisplay.ownerId;
  const commentsSidebarToggleLabel = threadsSidebarCollapsed ? '展开批注栏' : '收起批注栏';

  const handleMoreAction = (key: React.Key) => {
    if (key === 'permission') {
      setIsPermissionModalOpen(true);
      return;
    }
    if (key === 'comment-history') {
      setIsCommentHistoryOpen(true);
      return;
    }
    if (key === 'print-pdf') {
      setPdfIncludeComments(false);
      setIsPdfExportModalOpen(true);
      return;
    }
    if (key === 'download-md') {
      void handleDownloadMarkdown();
    }
  };

  return (
    <div className={styles.pageWrap}>
      <ResourceViewerHeader
        inlineTitle={
          <NoteToolbarTitle resourceId={resourceId} fallbackTitle={noteInfoDisplay?.noteTitle} />
        }
        extra={
          <div className={styles.headerToolbarExtra}>
            {showAiDiffDisplayModeSwitch ? (
              <Segmented
                value={aiDiffDisplayMode}
                className={styles.aiDiffDisplayModeSwitch}
                options={aiDiffDisplayOptions}
                disabled={showFullPageSpin}
                onChange={(value) => setAiDiffDisplayMode(value as AiDiffDisplayMode)}
              />
            ) : null}
            <div className={styles.headerActionsEnd}>
              <div className={styles.headerMoreWrap}>
                <Dropdown>
                  <Dropdown.Trigger>
                    <Button
                      variant="secondary"
                      size="sm"
                      isPending={headerMorePending}
                      isDisabled={showFullPageSpin}
                      aria-label="更多"
                    >
                      更多
                    </Button>
                  </Dropdown.Trigger>
                  <Dropdown.Popover placement="bottom end" className={styles.noteMorePopover}>
                    {canManageNotePermission ? (
                      <div
                        className={styles.ownerCommentPolicyRow}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <span className={styles.ownerCommentPolicyLabel}>
                          协作者仅可见自己的批注
                        </span>
                        <Switch
                          aria-label="协作者仅可见自己的批注"
                          isSelected={commentSettings.collaboratorVisibility === 'own_only'}
                          isDisabled={!isConnected}
                          onChange={(selected) =>
                            setCollaboratorVisibility(selected ? 'own_only' : 'all')
                          }
                          size="sm"
                        >
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch>
                      </div>
                    ) : null}
                    <Dropdown.Menu aria-label="笔记更多操作" onAction={handleMoreAction}>
                      {canManageNotePermission ? (
                        <Dropdown.Item id="permission" textValue="权限配置">
                          权限配置
                        </Dropdown.Item>
                      ) : null}
                      {noteInfoDisplay.commentsEnabled ? (
                        <Dropdown.Item id="comment-history" textValue="历史批注">
                          历史批注
                        </Dropdown.Item>
                      ) : null}
                      <Dropdown.Item id="print-pdf" textValue="打印为pdf">
                        打印为pdf
                      </Dropdown.Item>
                      <Dropdown.Item id="download-md" textValue="下载为md">
                        下载为md
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
              {noteInfoDisplay.commentsEnabled ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <Button
                      variant="secondary"
                      size="sm"
                      isDisabled={showFullPageSpin}
                      aria-label={commentsSidebarToggleLabel}
                      aria-expanded={!threadsSidebarCollapsed}
                      onPress={() => toggleNoteCommentsSidebar(resourceId)}
                    >
                      {threadsSidebarCollapsed ? (
                        <PanelRightOpen size={16} />
                      ) : (
                        <PanelRightClose size={16} />
                      )}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{commentsSidebarToggleLabel}</Tooltip.Content>
                </Tooltip>
              ) : null}
            </div>
          </div>
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
                    <ChevronsLeft size={20} />
                  </button>
                </div>
                <div className={styles.outlineScrollArea}>
                  <NoteOutline
                    items={outlineItems}
                    activeId={activeHeadingId}
                    titleResourceId={resourceId}
                    titleFallback={noteInfoDisplay?.noteTitle}
                    onNavigate={(id) => {
                      if (id === NOTE_OUTLINE_TITLE_ID) {
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
                  <Menu size={20} />
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
                    key={`${resourceId}-${noteInfoDisplay?.noteTitle ?? ''}-${noteInfoDisplay.canCollaborativeEdit}`}
                    ref={titleEditorRef}
                    id={resourceId}
                    initialContent={noteInfoDisplay?.noteTitle}
                    readOnly={isTitleReadOnly}
                    focusOnMount={isConnected && !isTitleReadOnly}
                    onEnterKey={focusBody}
                  />
                </div>
                <NoteInfoBar noteInfoDisplay={noteInfoDisplay} />
                <div className={styles.body}>
                  <CustomBlockNote
                    key={`${resourceId}-${noteInfoDisplay.canCollaborativeEdit}`}
                    ref={bodyEditorRef}
                    resourceId={resourceId}
                    doc={doc}
                    provider={provider}
                    aiDiffDisplayMode={aiDiffDisplayMode}
                    readOnly={isEditorReadOnly}
                    blockLocalDocWrites={blockLocalDocWrites}
                    onOutlineChange={setOutlineItems}
                    onActiveHeadingChange={setActiveHeadingId}
                    onAiDiffPresenceChange={handleAiDiffPresenceChange}
                    commentsEnabled={noteInfoDisplay.commentsEnabled}
                    commentsUiEnabled={isConnected && noteInfoDisplay.commentsEnabled}
                    commentsAuthorizable={noteInfoDisplay.canEditComments}
                    commentsWritable={isConnected && noteInfoDisplay.canEditComments}
                    commentUserId={currentUser?.id}
                    commentUsersById={noteInfoDisplay.authorsById}
                    isNoteOwner={canManageNotePermission}
                    collaboratorVisibility={commentSettings.collaboratorVisibility}
                    commentsSidebarCollapsed={threadsSidebarCollapsed}
                    commentsSidebarWidth={commentsSidebarWidth}
                    onCommentsSidebarWidthChange={(width) =>
                      setNoteCommentsSidebarWidth(resourceId, width)
                    }
                    commentHistoryOpen={isCommentHistoryOpen}
                    onCommentHistoryOpenChange={setIsCommentHistoryOpen}
                  />
                </div>
                <ResourceInteractFooter resourceId={resourceId} onRateSuccess={onRefreshNoteInfo} />
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
      <NotePermissionModal
        isOpen={isPermissionModalOpen}
        resourceId={resourceId}
        onOpenChange={setIsPermissionModalOpen}
        onSuccess={onRefreshNoteInfo}
      />
      <Modal isOpen={isPdfExportModalOpen} onOpenChange={setIsPdfExportModalOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>打印为 PDF</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {noteInfoDisplay.commentsEnabled ? (
                  <div
                    className={styles.pdfExportOptionRow}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <Checkbox
                      isSelected={pdfIncludeComments}
                      isDisabled={pdfExportLoading}
                      onChange={setPdfIncludeComments}
                      variant="secondary"
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <span>包含批注</span>
                      </Checkbox.Content>
                    </Checkbox>
                  </div>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  isDisabled={pdfExportLoading}
                  onPress={() => setIsPdfExportModalOpen(false)}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  isPending={pdfExportLoading}
                  onPress={() => void handlePrintPdf(pdfIncludeComments)}
                >
                  确认打印
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
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
      key={resourceId}
      noteId={noteId}
      resourceId={resourceId}
      noteInfoDisplay={noteInfoDisplay}
      onRefreshNoteInfo={refreshNoteInfo}
    />
  );
}

export default NoteView;
