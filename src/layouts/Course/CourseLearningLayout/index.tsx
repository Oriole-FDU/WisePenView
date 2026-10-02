import { useMount } from 'ahooks';
import { clsx } from 'clsx';
import { PanelRightClose, PanelRightOpen, Video } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { COURSE_ROLE } from '@/domains/Course';
import { clearFrontendStates, FRONTEND_STATE_SOURCE, setFrontendStates } from '@/frontendState';
import { chatDockActions, ChatDockLayout, useChatDockState } from '@/layouts/ChatDockLayout';
import {
  ResourceChatBindingProvider,
  resourceChatContextActions,
  ResourceChatPanel,
} from '@/layouts/Resource/_context/chatBinding';
import { buildResourceOpenState } from '@/layouts/Resource/_context/chatBinding/resourceChatModel';
import { ResourceEditorProvider, useResourceEditor } from '@/layouts/Resource/_context/editor';
import { useResourceChatContextStore } from '@/layouts/Resource/_store/useResourceChatContextStore';
import ResourceLayoutHeader from '@/layouts/Resource/ResourceLayout/ResourceLayoutHeader';

import { useCourseContext } from '../_context';
import CourseResourceHost from '../CourseResourceHost';
import CourseOutlineOverview from './_components/CourseOutlineOverview';
import CourseOutlineSidebar from './_components/CourseOutlineSidebar';
import CourseResourceIcon from './_components/CourseResourceIcon';
import { useCourseLearningNavigationController } from './controllers/useCourseLearningNavigationController';
import styles from './style.module.less';

const COURSE_LEARNING_MAIN_MIN_WIDTH = 700;

function CourseLearningLayoutContent() {
  const { t } = useTranslation('course');
  const { course } = useCourseContext();
  const navigation = useCourseLearningNavigationController(course.courseId);
  const chatDock = useChatDockState();
  // 课程学习页进入时收起对话面板，宽度与折叠态仍由应用壳 store 持久化。
  useMount(() => chatDockActions.collapse());
  const resourceChatContext = useResourceChatContextStore((state) => state.context);
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
  /**
   * @wisepen-manual-effect
   * 执行时机：离开课程学习页面时清理未发送的选区。
   * 不可替代原因：课程本地状态卸载时，共享模块仍按标签存在。
   * cleanup：移除该课程的选区。
   */
  useEffect(() => () => clearFrontendStates({ source: FRONTEND_STATE_SOURCE.SELECTION }), []);

  const workspaceHeader = (
    <ResourceLayoutHeader
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

  const studyArea = (
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
                  fallbackHeader={workspaceHeader}
                  onTargetChange={(target) => {
                    if (target.resourceId) navigation.openResource(target.resourceId);
                  }}
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
  );

  return (
    <ResourceChatBindingProvider>
      <ChatDockLayout
        leftMinWidth={COURSE_LEARNING_MAIN_MIN_WIDTH}
        panelId="course-learning-chat"
        chatLabel={t('learning.chat')}
        className={clsx(styles.root, chatDock.open && styles.rootChatOpen)}
        left={studyArea}
        right={
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
            clearContext={resourceChatContextActions.clearContext}
          />
        }
      />
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
