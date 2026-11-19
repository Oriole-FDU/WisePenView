import path from 'node:path';

const PASCAL_CASE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const CAMEL_CASE_NAME = /^[a-z][A-Za-z0-9]*$/;
const COMPONENT_ROOT = /^src\/(?:components|views|layouts)\//;
const STORY_OR_TEST_FILE = /\.(?:stories|test|spec)\.tsx?$/;

export const componentConventionBaseline = {
  componentEntries: [
    'src/components/base/DeferredContent/DeferredContent.tsx',
    'src/components/base/Markdown/Renderer.tsx',
    'src/components/base/Markdown/_context/MarkdownResourceResolverProvider.tsx',
    'src/components/base/Modal/_context/ModalRootControlProvider.tsx',
    'src/components/base/Table/shared/TableBase/_context/TableColumnAlignProvider.tsx',
    'src/components/base/DeferredContent/_context/DeferredOverlayProvider.tsx',
    'src/components/business/AccountVerification/AccountVerificationForm.tsx',
    'src/components/business/AccountVerification/AccountVerificationOutcomeDialog.tsx',
    'src/components/business/Chat/ChatConversation/ChatInput/_context/ChatInputFileProvider.tsx',
    'src/components/business/Chat/ChatConversation/ChatInput/_context/ChatInputStoreProvider.tsx',
    'src/components/business/Chat/ChatConversation/ChatMessageList/StreamingScrollFollower.tsx',
    'src/components/business/CommandPalette/ResourceSearchResults.tsx',
    'src/components/business/CommandPalette/Trigger.tsx',
    'src/components/business/Drive/DriveNavigator/DriveNavigatorNodeTitle.tsx',
    'src/components/business/Drive/common/resourcePermissionActionIcon.tsx',
    'src/components/business/ErrorPage/ErrorPage.tsx',
    'src/components/business/ErrorPage/ErrorPageActions.tsx',
    'src/components/business/ErrorPage/ErrorPageShell.tsx',
    'src/components/business/Group/MemberList/Modals/AssignQuotaModal.tsx',
    'src/components/business/Group/MemberList/Modals/DeleteMemberModal.tsx',
    'src/components/business/Group/MemberList/Modals/EditPermissionModal.tsx',
    'src/components/business/Group/MemberList/Modals/InviteUserModal.tsx',
    'src/components/business/InlineComment/CommentComposer.tsx',
    'src/components/business/Resource/FavoriteCollectionPicker/CollectionPickerModal.tsx',
    'src/components/business/Resource/ResourceFavoriteAction/ResourceFavoriteButton.tsx',
    'src/components/business/Resource/ResourceInteractionPanel/CommentComposer.tsx',
    'src/components/business/Resource/ResourceInteractionPanel/ResourceCommentItem.tsx',
    'src/components/business/Resource/ResourceInteractionPanel/ResourceCommentThread.tsx',
    'src/components/business/Resource/ResourceInteractionPanel/ResourceFeedbackSummary.tsx',
    'src/components/business/Sidebar/_common/tab/DriveTab/SidebarDriveNodeTitle.tsx',
    'src/components/business/Sidebar/_common/tab/DriveTab/SidebarDriveScopeSwitcher.tsx',
    'src/components/business/Wallet/ComputeWallet/WalletBalanceHeader.tsx',
    'src/components/business/Wallet/ComputeWallet/WalletTransactionTable.tsx',
    'src/components/business/WorkspacePanel/WorkspacePanel.tsx',
    'src/components/editors/ResourceEditor.tsx',
    'src/components/editors/_context/EditorSurfaceProvider.tsx',
    'src/components/editors/_runtime/EditorPresentationBinding/PresentationSlot.tsx',
    'src/components/editors/note/CustomBlockNote/NoteEditorSession.tsx',
    'src/components/editors/note/CustomBlockNote/engines/aiDiff/BulkActions.tsx',
    'src/components/editors/note/CustomBlockNote/engines/editor/_context/NoteEditorReadOnlyProvider.tsx',
    'src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/CodeBlockToolbar.tsx',
    'src/components/editors/note/CustomBlockNote/plugins/EmojiPlugin/EmojiPickerPopover.tsx',
    'src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/TableToolbar.tsx',
    'src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/_context/TableToolbarProvider.tsx',
    'src/components/editors/note/CustomBlockNote/runtime/_context/NoteInteractionStoreProvider.tsx',
    'src/components/editors/note/CustomBlockNote/session/_context/NoteEditorSessionProvider.tsx',
    'src/components/editors/note/CustomBlockNote/ui/NoteEditorSurface.tsx',
    'src/components/editors/note/CustomBlockNote/ui/editorMenus/colorPalette.tsx',
    'src/components/editors/note/CustomBlockNote/ui/slashMenu/slashMenuView.tsx',
    'src/components/editors/note/CustomBlockNote/ui/toolbar/components/BlockTypeMenu.tsx',
    'src/components/editors/note/CustomBlockNote/ui/toolbar/components/ColorMenu.tsx',
    'src/components/editors/note/CustomBlockNote/ui/toolbar/components/FileButtons.tsx',
    'src/components/editors/note/CustomBlockNote/ui/toolbar/components/LinkButton.tsx',
    'src/components/editors/note/CustomBlockNote/ui/toolbar/components/NestButtons.tsx',
    'src/components/editors/note/CustomBlockNote/ui/toolbar/components/TextAlignButtons.tsx',
    'src/components/editors/note/CustomBlockNote/ui/toolbar/components/TextStyleButtons.tsx',
    'src/components/editors/note/CustomBlockNote/ui/toolbar/components/ToolbarButton.tsx',
    'src/components/editors/skill/components/SkillActionDialogs.tsx',
    'src/components/editors/skill/components/SkillEditorPanel.tsx',
    'src/components/editors/skill/components/SkillFileTreePanel.tsx',
    'src/layouts/App/AppPageLayout.tsx',
    'src/layouts/App/_context/AppAuthProvider.tsx',
    'src/layouts/AppNavigation/AppNavigationLayout.tsx',
    'src/layouts/AppNavigation/_context/AppNavigationProvider.tsx',
    'src/layouts/Auth/AuthLayout.tsx',
    'src/layouts/Course/CourseLayout/CourseNavigationSidebar.tsx',
    'src/layouts/Course/CourseLearningLayout/_components/CourseOutlineSidebar/CourseOutlineMoveModal.tsx',
    'src/layouts/Course/CourseLearningLayout/_components/CourseOutlineSidebar/CourseOutlineNodeTitle.tsx',
    'src/layouts/Course/_context/CourseProvider.tsx',
    'src/layouts/MainShell/SkipToMainLink.tsx',
    'src/layouts/MainShell/_context/MainShellProvider.tsx',
    'src/layouts/Resource/ResourceLayout/ResourceLayout.tsx',
    'src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceTargetModal.tsx',
    'src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceToolbarActions.tsx',
    'src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceToolbarBreadcrumb.tsx',
    'src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceToolbarOperations.tsx',
    'src/layouts/Resource/_context/chatBinding/ResourceChatBinding.tsx',
    'src/layouts/Resource/_context/chatBinding/ResourceChatBindingProvider.tsx',
    'src/layouts/Resource/_context/editor/ResourceEditorProvider.tsx',
    'src/layouts/Resource/_context/host/ResourceHostProvider.tsx',
    'src/layouts/WorkspaceRightPanelLayout/WorkspacePanelTarget.tsx',
    'src/layouts/WorkspaceRightPanelLayout/WorkspaceRightPanelLayout.tsx',
    'src/layouts/WorkspaceRightPanelLayout/_context/WorkspacePanelPortalProvider.tsx',
    'src/views/admin/guard/AdminRouteGuard.tsx',
    'src/views/app/course/CourseRoute/CourseTourScope.tsx',
    'src/views/app/course/_guards/CourseSettingsRouteGuard.tsx',
    'src/views/app/drive/_components/FavoritesTab/components/FavoriteCollectionList.tsx',
    'src/views/app/drive/_components/FavoritesTab/components/FavoriteResourceTable.tsx',
    'src/views/app/drive/_components/FavoritesTab/components/UnfavoriteResourceModal.tsx',
    'src/views/app/group/GroupDetail/_guards/GroupWalletRouteGuard.tsx',
    'src/views/app/group/GroupDetail/_pages/GroupFilesPage.tsx',
    'src/views/app/group/GroupDetail/_pages/GroupMembersPage.tsx',
    'src/views/app/group/GroupDetail/_pages/GroupSettingsPage.tsx',
    'src/views/app/group/GroupDetail/_pages/GroupTokenTransferPage.tsx',
    'src/views/app/group/GroupDetail/_pages/GroupWalletPage.tsx',
    'src/views/app/group/GroupRoute/_context/GroupProvider.tsx',
    'src/views/app/profile/AI/ModelSettingsSection.tsx',
    'src/views/app/profile/AI/ProviderSettingsSection.tsx',
    'src/views/app/profile/AI/WebSearchSettingsSection.tsx',
    'src/views/app/resource/ResourceTargetResolver/_components/FileViewerResolver.tsx',
    'src/views/app/resource/ResourceTargetResolver/_components/ResourceEditorWorkspace/_components/ResourceInlineCommentPanel.tsx',
    'src/views/app/resource/ResourceTargetResolver/_components/ResourceEditorWorkspace/_components/ResourceWorkspacePanelActions.tsx',
    'src/views/app/resource/ResourceTargetResolver/_components/ResourceEditorWorkspace/_components/ResourceWorkspacePresentation.tsx',
    'src/views/app/resource/ResourceTargetResolver/_components/UnsupportedResource.tsx',
  ],
  componentNames: [
    'src/components/base/Avatar/index.tsx',
    'src/components/base/Button/ButtonGroup/index.tsx',
    'src/components/base/Button/ToggleButtonGroup/index.tsx',
    'src/components/base/Input/DatePicker/index.tsx',
    'src/components/base/SystemResizable/index.tsx',
    'src/components/base/Table/DataTable/parts/LoadingSkeleton/index.tsx',
    'src/components/base/Table/DataTable/parts/UnderlineTabs/index.tsx',
    'src/components/base/Table/FolderTable/index.tsx',
    'src/components/base/Table/FolderTable/parts/BatchFooter/index.tsx',
    'src/components/base/Table/FolderTable/parts/FolderNameCell/index.tsx',
    'src/components/base/Table/FolderTable/parts/LoadingSkeleton/index.tsx',
    'src/components/base/Table/shared/TableSortHeader/index.tsx',
    'src/components/base/Table/shared/TableStatusRows/index.tsx',
    'src/components/base/Table/shared/cells/CellAlign/index.tsx',
    'src/components/base/Table/shared/cells/MemberCell/index.tsx',
    'src/components/base/Table/shared/cells/TextCell/index.tsx',
    'src/components/business/AppFormDialog/index.tsx',
    'src/components/business/Chat/ChatConversation/ChatMessageList/Message/Assistant/index.tsx',
    'src/components/business/Chat/ChatConversation/ChatMessageList/Message/Content/index.tsx',
    'src/components/business/Chat/ChatConversation/ChatMessageList/Message/User/index.tsx',
    'src/components/business/Chat/WelcomeConfigurable/Host/index.tsx',
    'src/components/business/Chat/WelcomeConfigurable/Starter/index.tsx',
    'src/components/business/Chat/WelcomeConfigurable/Title/index.tsx',
    'src/components/business/Drive/PermissionActionEditor/index.tsx',
    'src/components/business/Drive/TableDrive/parts/DriveDnd/index.tsx',
    'src/components/business/Group/DefaultAccessPermissionModal/index.tsx',
    'src/views/app/course/CourseEditorPage/_components/CourseEditorDateFields/index.tsx',
    'src/views/app/profile/AI/index.tsx',
    'src/views/app/public/Invite/index.tsx',
  ],
  componentFolders: [
    'src/components/business/Sidebar/_common/tab/index.tsx',
    'src/components/editors/agent/index.tsx',
    'src/components/editors/drawio/index.tsx',
    'src/components/editors/html/index.tsx',
    'src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/tableHandles/index.tsx',
    'src/components/editors/note/CustomBlockNote/ui/findBar/index.tsx',
    'src/components/editors/note/CustomBlockNote/ui/sideMenu/index.tsx',
    'src/components/editors/note/CustomBlockNote/ui/slashMenu/index.tsx',
    'src/components/editors/note/CustomBlockNote/ui/toolbar/index.tsx',
    'src/components/editors/note/index.tsx',
    'src/components/editors/office/index.tsx',
    'src/components/editors/pdf/index.tsx',
    'src/components/editors/skill/index.tsx',
    'src/views/app/chat/index.tsx',
    'src/views/app/notifications/index.tsx',
  ],
  supportFiles: [
    'src/components/business/Group/GroupDisplayConfig.ts',
    'src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/AiDiffView.ts',
    'src/components/editors/note/CustomBlockNote/plugins/TablePlugin/AiDiffView.ts',
  ],
  typeFiles: ['src/components/business/Chat/send.type.ts'],
  styleImports: [
    'src/components/business/Drive/TableDrive/parts/CreateMenu/index.tsx',
    'src/components/business/ErrorPage/ErrorPage.tsx',
    'src/components/business/ErrorPage/ErrorPageActions.tsx',
    'src/components/business/ErrorPage/ErrorPageShell.tsx',
    'src/layouts/App/AppPageLayout.tsx',
    'src/layouts/MainShell/SkipToMainLink.tsx',
    'src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceTargetModal.tsx',
    'src/views/app/group/_components/GroupModals/CreateGroupModal/index.tsx',
    'src/views/app/group/_components/GroupModals/ExitGroupModal/index.tsx',
  ],
};

const createBaselineSet = (paths) => new Set(paths);
const componentEntryBaseline = createBaselineSet(componentConventionBaseline.componentEntries);
const componentNameBaseline = createBaselineSet(componentConventionBaseline.componentNames);
const componentFolderBaseline = createBaselineSet(componentConventionBaseline.componentFolders);
const supportFileBaseline = createBaselineSet(componentConventionBaseline.supportFiles);
const typeFileBaseline = createBaselineSet(componentConventionBaseline.typeFiles);
const styleImportBaseline = createBaselineSet(componentConventionBaseline.styleImports);

const normalizeRelativePath = (cwd, filename) =>
  path.relative(cwd, filename).split(path.sep).join('/');

const unwrapExpression = (node) => {
  let current = node;
  while (
    current &&
    [
      'ChainExpression',
      'ParenthesizedExpression',
      'TSAsExpression',
      'TSInstantiationExpression',
      'TSNonNullExpression',
      'TSSatisfiesExpression',
      'TSTypeAssertion',
    ].includes(current.type)
  ) {
    current = current.expression;
  }
  return current;
};

const isInsideNode = (childRange, nodeRange) =>
  childRange[0] >= nodeRange[0] && childRange[1] <= nodeRange[1];

const hasJsxInside = (node, jsxRanges) => {
  if (!node?.range) return false;
  return jsxRanges.some((range) => isInsideNode(range, node.range));
};

const getCallName = (node) => {
  const callee = unwrapExpression(node.callee);
  if (callee?.type === 'Identifier') return callee.name;
  if (
    callee?.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier'
  ) {
    return `${callee.object.name}.${callee.property.name}`;
  }
  return null;
};

const isComponentValue = (node, jsxRanges) => {
  const current = unwrapExpression(node);
  if (!current) return false;
  if (hasJsxInside(current, jsxRanges)) return true;
  if (current.type !== 'CallExpression') return false;

  const callName = getCallName(current);
  if (callName === 'Object.assign' || callName === 'memo' || callName === 'forwardRef') {
    return true;
  }
  if (callName?.endsWith('.memo') || callName?.endsWith('.forwardRef')) return true;
  return current.arguments.some((argument) => isComponentValue(argument, jsxRanges));
};

const collectComponentDeclarations = (declaration, jsxRanges) => {
  if (!declaration) return [];
  if (
    (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') &&
    declaration.id?.name &&
    PASCAL_CASE_NAME.test(declaration.id.name) &&
    (hasJsxInside(declaration, jsxRanges) || isComponentValue(declaration, jsxRanges))
  ) {
    return [{ name: declaration.id.name, node: declaration }];
  }
  if (declaration.type !== 'VariableDeclaration') return [];

  return declaration.declarations.flatMap((declarator) => {
    if (declarator.id.type !== 'Identifier') return [];
    return PASCAL_CASE_NAME.test(declarator.id.name) && isComponentValue(declarator.init, jsxRanges)
      ? [{ name: declarator.id.name, node: declarator }]
      : [];
  });
};

const getDefaultExportName = (node) => {
  const current = unwrapExpression(node);
  if (!current) return '<anonymous>';
  if (
    (current.type === 'FunctionDeclaration' || current.type === 'ClassDeclaration') &&
    current.id?.name
  ) {
    return current.id.name;
  }
  if (
    (current.type === 'FunctionExpression' || current.type === 'ClassExpression') &&
    current.id?.name
  ) {
    return current.id.name;
  }
  if (current.type === 'Identifier') return current.name;
  if (current.type === 'CallExpression') {
    for (const argument of current.arguments) {
      const argumentName = getDefaultExportName(argument);
      if (argumentName !== '<anonymous>') return argumentName;
    }
  }
  return '<anonymous>';
};

const getSupportFileStem = (filename) => filename.split('.')[0];

export const componentConventionRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '约束组件目录、入口、导出和辅助文件的 PascalCase / camelCase 命名',
    },
    schema: [],
    messages: {
      componentEntry: 'React 组件必须位于 PascalCase 文件夹的 index.tsx；当前文件为 {{file}}。',
      componentFolder: '组件入口目录必须使用 PascalCase；当前目录为 {{folder}}。',
      componentExport: '组件导出必须使用 PascalCase；当前导出名为 {{name}}。',
      componentName: '组件目录名必须与主导出保持一致；目录为 {{folder}}，主导出为 {{name}}。',
      supportFile: '组件目录根部的逻辑/辅助文件必须使用 camelCase；当前文件为 {{file}}。',
      typeFile: '组件目录根部的公共类型文件统一命名为 index.type.ts。',
      styleImport: '组件私有 CSS Modules 统一命名为 style.module.scss，不使用 {{file}}。',
    },
  },
  create(context) {
    const relativePath = normalizeRelativePath(context.cwd, context.filename);
    if (!COMPONENT_ROOT.test(relativePath) || STORY_OR_TEST_FILE.test(relativePath)) {
      return {};
    }

    const filename = path.basename(relativePath);
    const folder = path.basename(path.dirname(relativePath));
    const extension = path.extname(relativePath);
    const isPascalCaseFolder = PASCAL_CASE_NAME.test(folder);

    if (extension === '.ts' && isPascalCaseFolder) {
      const isTypeFile = filename.endsWith('.type.ts');
      const isCanonicalTypeFile = filename === 'index.type.ts';
      const supportName = getSupportFileStem(filename);

      if (isTypeFile && !isCanonicalTypeFile) {
        if (!typeFileBaseline.has(relativePath)) {
          context.report({ node: context.sourceCode.ast, messageId: 'typeFile' });
        }
      } else if (
        filename !== 'index.ts' &&
        !CAMEL_CASE_NAME.test(supportName) &&
        !supportFileBaseline.has(relativePath)
      ) {
        context.report({
          node: context.sourceCode.ast,
          messageId: 'supportFile',
          data: { file: filename },
        });
      }
    }

    if (extension !== '.tsx') return {};

    const jsxRanges = [];
    return {
      JSXElement(node) {
        jsxRanges.push(node.range);
      },
      JSXFragment(node) {
        jsxRanges.push(node.range);
      },
      JSXSelfClosingElement(node) {
        jsxRanges.push(node.range);
      },
      ImportDeclaration(node) {
        const importPath = node.source.value;
        if (typeof importPath !== 'string' || !isPascalCaseFolder) return;
        if (
          /^\.\/[^/]+\.module\.(?:css|scss)$/.test(importPath) &&
          importPath !== './style.module.scss' &&
          !styleImportBaseline.has(relativePath)
        ) {
          context.report({
            node: node.source,
            messageId: 'styleImport',
            data: { file: importPath.slice(2) },
          });
        }
      },
      'Program:exit'(program) {
        const localComponents = new Map();
        const exportedComponents = [];
        let defaultExportNode = null;

        for (const statement of program.body) {
          if (statement.type === 'ExportDefaultDeclaration') {
            defaultExportNode = statement.declaration;
          }

          const declaration =
            statement.type === 'ExportDefaultDeclaration' ||
            statement.type === 'ExportNamedDeclaration'
              ? statement.declaration
              : statement;
          const directComponents = collectComponentDeclarations(declaration, jsxRanges);
          for (const component of directComponents) {
            localComponents.set(component.name, component);
            if (statement.type === 'ExportNamedDeclaration') {
              exportedComponents.push(component);
            }
          }

          if (statement.type === 'ExportNamedDeclaration') {
            for (const specifier of statement.specifiers) {
              const localName = specifier.local.name;
              const component = localComponents.get(localName);
              if (component) exportedComponents.push(component);
            }
          }
        }

        const hasComponentExport = defaultExportNode != null || exportedComponents.length > 0;
        if (!hasComponentExport) return;

        if (filename !== 'index.tsx' && !componentEntryBaseline.has(relativePath)) {
          context.report({
            node: program,
            messageId: 'componentEntry',
            data: { file: filename },
          });
        }

        if (
          filename === 'index.tsx' &&
          !isPascalCaseFolder &&
          !componentFolderBaseline.has(relativePath)
        ) {
          context.report({
            node: program,
            messageId: 'componentFolder',
            data: { folder },
          });
        }

        const reportedNodes = new Set();
        for (const component of exportedComponents) {
          if (PASCAL_CASE_NAME.test(component.name) || reportedNodes.has(component.node)) continue;
          reportedNodes.add(component.node);
          context.report({
            node: component.node,
            messageId: 'componentExport',
            data: { name: component.name },
          });
        }

        if (defaultExportNode) {
          const defaultExportName = getDefaultExportName(defaultExportNode);
          if (!PASCAL_CASE_NAME.test(defaultExportName)) {
            context.report({
              node: defaultExportNode,
              messageId: 'componentExport',
              data: { name: defaultExportName },
            });
          }
        }

        if (filename === 'index.tsx' && isPascalCaseFolder) {
          const primaryComponentName = defaultExportNode
            ? getDefaultExportName(defaultExportNode)
            : exportedComponents[0]?.name;
          if (
            primaryComponentName &&
            PASCAL_CASE_NAME.test(primaryComponentName) &&
            primaryComponentName !== folder &&
            !componentNameBaseline.has(relativePath)
          ) {
            context.report({
              node: defaultExportNode ?? exportedComponents[0].node,
              messageId: 'componentName',
              data: { folder, name: primaryComponentName },
            });
          }
        }
      },
    };
  },
};
