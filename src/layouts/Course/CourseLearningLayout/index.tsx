import { clsx } from 'clsx';
import { PanelRightClose, PanelRightOpen, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/components/base/SystemResizable';
import { COURSE_ROLE } from '@/domains/Course';
import { clearFrontendStates, FRONTEND_STATE_SOURCE, setFrontendStates } from '@/frontendState';
import {
  ResourceChatBindingProvider,
  ResourceChatPanel,
  ResourceEditorProvider,
  useResourceEditor,
} from '@/layouts/Resource/_context';
import {
  buildResourceOpenState,
  type ResourceChatContext,
} from '@/layouts/Resource/_context/resourceChatModel';
import ResourceWorkspaceHeader from '@/views/resource/ResourceWorkspaceHeader';

import { useCourseContext } from '../_context';
import CourseResourceHost from '../CourseResourceHost';
import CourseOutlineOverview from './_components/CourseOutlineOverview';
import CourseOutlineSidebar from './_components/CourseOutlineSidebar';
import CourseResourceIcon from './_components/CourseResourceIcon';
import { useCourseChatDockController } from './controllers/useCourseChatDockController';
import { useCourseLearningNavigationController } from './controllers/useCourseLearningNavigationController';
import styles from './style.module.less';

const COURSE_LEARNING_MAIN_MIN_WIDTH = 700;

function CourseLearningLayoutContent() {
  const { t } = useTranslation('course');
  const { course } = useCourseContext();
  const navigation = useCourseLearningNavigationController(course.courseId);
  const chatDock = useCourseChatDockController();
  const [resourceChatContext, setResourceChatContext] = useState<ResourceChatContext>();
  const resourceChatContextRef = useRef<ResourceChatContext | undefined>(undefined);
  const selectedNode = navigation.selectedNode;
  const openResource = selectedNode?.nodeType === 'RESOURCE' ? selectedNode : undefined;
  const { snapshot: editorSnapshot } = useResourceEditor();
  const openedResource = editorSnapshot?.openedResource ?? openResource;
  const openResourceId = openedResource?.resourceId;
  const openResourceType = openedResource?.resourceType;
  const openResourceViewer = openedResource?.viewer;
  /**
   * @wisepen-manual-effect
   * 执行时机：课程当前资源变化时同步聊天请求中的打开资源。
   * 不可替代原因：课程聊天面板可折叠，资源身份由课程布局持有。
   * cleanup：按写入版本清理旧资源。
   */
  useEffect(() => {
    if (!openResourceId || !openResourceType) {
      clearFrontendStates({ source: FRONTEND_STATE_SOURCE.RESOURCE });
      return;
    }
    const revision = setFrontendStates({
      source: FRONTEND_STATE_SOURCE.RESOURCE,
      resourceId: openResourceId,
      entries: [
        buildResourceOpenState({
          resourceId: openResourceId,
          resourceType: openResourceType,
          viewer: openResourceViewer,
        }),
      ],
    });
    return () => clearFrontendStates({ source: FRONTEND_STATE_SOURCE.RESOURCE, revision });
  }, [openResourceId, openResourceType, openResourceViewer]);
  const handleSetResourceChatContext = (context: ResourceChatContext) => {
    resourceChatContextRef.current = context;
    setResourceChatContext(context);
  };
  const handleClearResourceChatContext = (context?: ResourceChatContext) => {
    if (context && resourceChatContextRef.current !== context) return;
    resourceChatContextRef.current = undefined;
    setResourceChatContext(undefined);
    clearFrontendStates({ source: FRONTEND_STATE_SOURCE.SELECTION });
  };
  /**
   * @wisepen-manual-effect
   * 执行时机：离开课程学习页面时清理未发送的选区。
   * 不可替代原因：课程本地状态卸载时，共享模块仍按标签存在。
   * cleanup：移除该课程的选区。
   */
  useEffect(() => () => clearFrontendStates({ source: FRONTEND_STATE_SOURCE.SELECTION }), []);

  const workspaceHeader = (
    <ResourceWorkspaceHeader
      inlineTitle={
        <span className={styles.workspaceTitle}>
          {selectedNode ? <CourseResourceIcon node={selectedNode} size={18} /> : null}
          <span>{selectedNode?.title ?? course.name}</span>
        </span>
      }
      extra={
        <AppIconButton
          icon={
            chatDock.collapsed ? (
              <PanelRightOpen size={18} aria-hidden />
            ) : (
              <PanelRightClose size={18} aria-hidden />
            )
          }
          label={chatDock.collapsed ? t('learning.openChat') : t('learning.closeChat')}
          isActive={!chatDock.collapsed}
          onPress={chatDock.toggle}
        />
      }
    />
  );

  return (
    <ResourceChatBindingProvider>
      <SystemResizablePanelGroup
        orientation="horizontal"
        className={clsx(styles.root, chatDock.open && styles.rootChatOpen)}
        resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
        onLayoutChanged={chatDock.handleLayoutChanged}
      >
        <SystemResizablePanel
          id="course-learning-main"
          minSize={COURSE_LEARNING_MAIN_MIN_WIDTH}
          className={styles.learningPanel}
        >
          <section className={styles.studyShell}>
            <CourseOutlineSidebar
              courseId={course.courseId}
              courseName={course.name}
              editable={course.myRole === COURSE_ROLE.TEACHER}
              nodes={navigation.visibleNodes}
              allNodes={navigation.outlineNodes}
              selectedNodeId={selectedNode?.nodeId}
              searchQuery={navigation.searchQuery}
              expandSearchResults={Boolean(navigation.normalizedQuery)}
              loading={navigation.loading}
              error={navigation.error}
              resourcePageStateMap={navigation.resourcePageStateMap}
              onSearchQueryChange={navigation.setSearchQuery}
              onSelectNode={navigation.openOutlineNode}
              onOpenCourseHome={navigation.openCourseHome}
              onExpandNode={navigation.expandOutlineNode}
              onLoadMoreResources={navigation.loadMoreOutlineResources}
              onRefresh={navigation.refresh}
              onRetry={navigation.refresh}
            />

            <div className={styles.studyWorkspace}>
              {selectedNode?.nodeType === 'RESOURCE' && selectedNode.viewer !== 'video'
                ? null
                : workspaceHeader}
              <main className={styles.studyMain}>
                {selectedNode ? (
                  selectedNode.nodeType === 'RESOURCE' ? (
                    selectedNode.viewer === 'video' ? (
                      <div className={styles.resourceViewer}>
                        <Video size={44} aria-hidden />
                        <h2>{selectedNode.title}</h2>
                        <p>{t('outline.videoUnsupported')}</p>
                      </div>
                    ) : (
                      <CourseResourceHost
                        key={selectedNode.nodeId}
                        courseId={course.courseId}
                        target={{
                          resourceId: selectedNode.resourceId,
                          resourceType: selectedNode.resourceType,
                          resourceName: selectedNode.title,
                          viewer: selectedNode.viewer,
                        }}
                        chatPanelCollapsed={chatDock.collapsed}
                        onToggleChatPanel={chatDock.toggle}
                        fallbackHeader={workspaceHeader}
                        onTargetChange={(target) => {
                          if (target.resourceId) navigation.openResource(target.resourceId);
                        }}
                        onOpenChatPanel={chatDock.openPanel}
                        onSetChatContext={handleSetResourceChatContext}
                        onClearChatContext={handleClearResourceChatContext}
                        onClose={navigation.openCourseHome}
                      />
                    )
                  ) : (
                    <CourseOutlineOverview
                      key={selectedNode.nodeId}
                      courseId={course.courseId}
                      node={selectedNode}
                      resources={navigation.selectedResources}
                      editable={course.myRole === COURSE_ROLE.TEACHER}
                      onOpenResource={(nodeId) => navigation.openOutlineNode(nodeId)}
                      onSaved={navigation.refresh}
                    />
                  )
                ) : (
                  <div className={styles.emptyMain}>{t('outline.empty')}</div>
                )}
              </main>
            </div>
          </section>
        </SystemResizablePanel>

        <SystemResizableHandle
          collapsed={!chatDock.open}
          disabled={!chatDock.open}
          aria-label={t('learning.resizeChat')}
        />
        <SystemResizablePanel
          id="course-learning-chat"
          panelRef={chatDock.panelRef}
          defaultSize={chatDock.panelSize}
          minSize={chatDock.minSize}
          maxSize={chatDock.maxSize}
          groupResizeBehavior="preserve-pixel-size"
          className={styles.chatDock}
          aria-label={t('learning.chat')}
          aria-hidden={!chatDock.open ? true : undefined}
          onResize={chatDock.handleResize}
        >
          {chatDock.open ? (
            <ResourceChatPanel
              target={
                selectedNode?.nodeType === 'RESOURCE'
                  ? {
                      resourceId: selectedNode.resourceId,
                      resourceType: selectedNode.resourceType,
                      viewer: selectedNode.viewer,
                    }
                  : undefined
              }
              showCollapseButton={false}
              context={resourceChatContext}
              clearContext={handleClearResourceChatContext}
            />
          ) : null}
        </SystemResizablePanel>
      </SystemResizablePanelGroup>
    </ResourceChatBindingProvider>
  );
}

export default function CourseLearningLayout() {
  return (
    <ResourceEditorProvider>
      <CourseLearningLayoutContent />
    </ResourceEditorProvider>
  );
}
