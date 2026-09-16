import { PanelRightClose, PanelRightOpen, Video } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import ChatPanel from '@/components/business/ChatPanel';
import {
  createResourceChatStateProvider,
  type ResourceChatContext,
} from '@/components/business/ChatPanel/ResourceChatProtocol';
import { COURSE_ROLE } from '@/domains/Course';
import {
  RESIZE_TARGET_MINIMUM_SIZE,
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/layouts/_common/SystemResizable';
import ResourceShellHeader from '@/layouts/Resource/ResourceShellHeader';
import { cn } from '@/utils/cn';
import type { ResourceHostLayoutConfig } from '@/views/resource/ResourceHostContext';

import { useCourseContext } from '../CourseContext';
import CourseResourceHost from '../CourseResourceHost';
import CourseOutlineOverview from './_components/CourseOutlineOverview';
import CourseOutlineSidebar from './_components/CourseOutlineSidebar';
import CourseResourceIcon from './_components/CourseResourceIcon';
import { useCourseChatDockController } from './controllers/useCourseChatDockController';
import { useCourseLearningNavigationController } from './controllers/useCourseLearningNavigationController';
import styles from './style.module.less';

const COURSE_LEARNING_MAIN_MIN_WIDTH = 700;

function CourseLearningLayout() {
  const { t } = useTranslation('course');
  const { course } = useCourseContext();
  const navigation = useCourseLearningNavigationController(course.courseId);
  const chatDock = useCourseChatDockController();
  const [resourceLayoutConfig, setResourceLayoutConfig] = useState<ResourceHostLayoutConfig>({});
  const [resourceChatContext, setResourceChatContext] = useState<ResourceChatContext>();
  const selectedNode = navigation.selectedNode;
  const registeredHeader =
    resourceLayoutConfig.header === false ? undefined : resourceLayoutConfig.header;
  const registeredResourceHeader =
    selectedNode?.nodeType === 'RESOURCE' &&
    registeredHeader?.resource?.resourceId === selectedNode.resourceId
      ? registeredHeader
      : undefined;
  const fallbackChatStateProvider =
    selectedNode?.nodeType === 'RESOURCE'
      ? createResourceChatStateProvider({
          resourceId: selectedNode.resourceId,
          resourceType: selectedNode.resourceType,
          viewer: selectedNode.viewer,
        })
      : undefined;
  const chatStateProvider =
    registeredResourceHeader?.resource && resourceLayoutConfig.chatStateProvider
      ? resourceLayoutConfig.chatStateProvider
      : fallbackChatStateProvider;

  const handleClearResourceChatContext = (context?: ResourceChatContext) => {
    setResourceChatContext((current) => (context && current !== context ? current : undefined));
  };

  const workspaceHeader = registeredResourceHeader?.resource ? (
    <ResourceShellHeader
      {...registeredResourceHeader}
      resource={{
        ...registeredResourceHeader.resource,
        breadcrumbItems: [],
        chatPanelCollapsed: chatDock.collapsed,
        onToggleChatPanel: chatDock.toggle,
      }}
    />
  ) : (
    <ResourceShellHeader
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
    <SystemResizablePanelGroup
      orientation="horizontal"
      className={cn(styles.root, chatDock.open && styles.rootChatOpen)}
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
            {workspaceHeader}
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
                      layoutConfig={resourceLayoutConfig}
                      onTargetChange={(target) => {
                        if (target.resourceId) navigation.openResource(target.resourceId);
                      }}
                      onLayoutConfigChange={setResourceLayoutConfig}
                      onOpenChatPanel={chatDock.openPanel}
                      onSetChatContext={setResourceChatContext}
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
          <ChatPanel
            showCollapseButton={false}
            resourceChat={{
              provider: chatStateProvider,
              context: resourceChatContext,
              clearContext: handleClearResourceChatContext,
            }}
          />
        ) : null}
      </SystemResizablePanel>
    </SystemResizablePanelGroup>
  );
}

export default CourseLearningLayout;
