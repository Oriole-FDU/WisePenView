// TODO(component-structure)：仅登记本轮未机械迁移的复杂历史诊断；新增违规仍阻塞。
// reason 说明迁移原因与步骤；diagnostics 精确到目标且保留次数，已解决项必须删除。
export const componentTodos = {
  'src/components/base/AppForm/index.tsx': {
    reason:
      '同入口包含 AppFormSection、AppFormRows、AppFormRow、AppFormAnchorNav 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: [
      'publicType:AppFormSectionProps',
      'publicType:AppFormRowsProps',
      'publicType:AppFormRowProps',
      'publicType:AppFormAnchorNavProps',
      'multiple:AppFormSection',
      'multiple:AppFormRows',
      'multiple:AppFormRow',
      'multiple:AppFormAnchorNav',
    ],
  },
  'src/components/base/AppModal/index.tsx': {
    reason:
      '同入口包含 AppModalBody、AppModalFooter 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:AppModalBody', 'multiple:AppModalFooter'],
  },
  'src/components/base/AppPopover/index.tsx': {
    reason:
      '同入口包含 AppPopoverHeader、AppPopoverContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:AppPopoverHeader', 'multiple:AppPopoverContent'],
  },
  'src/components/base/Avatar/index.tsx': {
    reason:
      '同入口包含 AppAvatarImage 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: ['multiple:AppAvatarImage', 'name:Avatar -> AppAvatar'],
  },
  'src/components/base/DeferredContent/DeferredContent.tsx': {
    reason:
      '延迟挂载模块同时公开组件与 Context 协议；先分离公共协议与组件入口，再替换现有 barrel 和 _context 路径。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/base/DeferredContent/DeferredContent.tsx (DeferredContent)',
    ],
  },
  'src/components/base/Dropdown/index.tsx': {
    reason:
      '同入口包含 DropdownPopover、DropdownItem 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:DropdownPopover', 'multiple:DropdownItem'],
  },
  'src/components/base/Guide/GuideHost/index.tsx': {
    reason:
      '同入口包含 GuidePlayer 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:GuidePlayer'],
  },
  'src/components/base/Guide/GuideTooltip/index.tsx': {
    reason:
      '同入口包含 GuideArrow 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:GuideArrow'],
  },
  'src/components/base/Input/Autocomplete/index.tsx': {
    reason:
      '同入口包含 AutocompleteTrigger、AutocompleteValue、AutocompleteIndicator、AutocompleteClearButton、AutocompletePopover 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: [
      'multiple:AutocompleteTrigger',
      'multiple:AutocompleteValue',
      'multiple:AutocompleteIndicator',
      'multiple:AutocompleteClearButton',
      'multiple:AutocompletePopover',
    ],
  },
  'src/components/base/Input/ComboBox/index.tsx': {
    reason:
      '同入口包含 ComboBoxInputGroup、ComboBoxTrigger、ComboBoxPopover 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: [
      'multiple:ComboBoxInputGroup',
      'multiple:ComboBoxTrigger',
      'multiple:ComboBoxPopover',
    ],
  },
  'src/components/base/Input/CommentInput/index.tsx': {
    reason:
      '同入口包含 PendingImagePreview 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:PendingImagePreview'],
  },
  'src/components/base/Input/DatePicker/index.tsx': {
    reason:
      '同入口包含 DateRangeField、TimeField 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'publicType:DatePickerFieldProps',
      'publicType:DateRangeFieldProps',
      'publicType:TimeFieldProps',
      'name:DatePicker -> DatePickerField',
      'multiple:DateRangeField',
      'multiple:TimeField',
    ],
  },
  'src/components/base/Input/EmojiPicker/index.tsx': {
    reason:
      '同入口包含 EmojiPickerContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:EmojiPickerContent'],
  },
  'src/components/base/Input/Fieldset/index.tsx': {
    reason:
      '同入口包含 FieldsetLegend、FieldGroup、FieldsetActions 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:FieldsetLegend', 'multiple:FieldGroup', 'multiple:FieldsetActions'],
  },
  'src/components/base/Input/Select/index.tsx': {
    reason:
      '同入口包含 SelectTrigger、SelectValue、SelectIndicator、SelectPopover 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: [
      'multiple:SelectTrigger',
      'multiple:SelectValue',
      'multiple:SelectIndicator',
      'multiple:SelectPopover',
    ],
  },
  'src/components/base/ListBox/index.tsx': {
    reason:
      '同入口包含 ListBoxItem 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:ListBoxItem'],
  },
  'src/components/base/Markdown/Renderer.tsx': {
    reason:
      '保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/base/Markdown/Renderer.tsx (MarkdownLink)',
      'entry:src/components/base/Markdown/Renderer.tsx (MarkdownImage)',
      'entry:src/components/base/Markdown/Renderer.tsx (FootnoteNavigationLink)',
      'entry:src/components/base/Markdown/Renderer.tsx (MarkdownBlockView)',
      'entry:src/components/base/Markdown/Renderer.tsx (MarkdownFootnotes)',
      'entry:src/components/base/Markdown/Renderer.tsx (MarkdownRenderer)',
    ],
  },
  'src/components/base/Markdown/index.tsx': {
    reason:
      '根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。',
    diagnostics: ['member:src/components/base/Markdown/Renderer.tsx'],
  },
  'src/components/base/Markdown/_parts/CodeBlock/index.tsx': {
    reason:
      '同入口包含 CodeBlockFrame、HighlightedCode 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:CodeBlockFrame', 'multiple:HighlightedCode'],
  },
  'src/components/base/Modal/index.tsx': {
    reason:
      '同入口包含 ModalBackdrop、ModalDialog 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:ModalBackdrop', 'multiple:ModalDialog'],
  },
  'src/components/base/Popover/index.tsx': {
    reason:
      '同入口包含 PopoverContent、PopoverDialog 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:PopoverContent', 'multiple:PopoverDialog'],
  },
  'src/components/base/Table/FolderTable/index.tsx': {
    reason:
      '同入口包含 FolderTableBodyRowBase 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['publicType:FolderTableBodyRowProps', 'multiple:FolderTableBodyRowBase'],
  },
  'src/components/base/Table/shared/TableSortHeader/index.tsx': {
    reason:
      '根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。',
    diagnostics: [
      'member:src/components/base/Table/shared/TableSortHeader/renderSortableColumnLabel.tsx',
    ],
  },
  'src/components/base/Table/shared/TableStatusRows/index.tsx': {
    reason:
      '同入口包含 TableLoadMoreRow 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: ['name:TableStatusRows -> TableRefreshIndicator', 'multiple:TableLoadMoreRow'],
  },
  'src/components/base/Tabs/index.tsx': {
    reason:
      '同入口包含 TabsList、TabsIndicator 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:TabsList', 'multiple:TabsIndicator'],
  },
  'src/components/base/Tooltip/index.tsx': {
    reason:
      '同入口包含 TooltipContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:TooltipContent'],
  },
  'src/components/business/AppAlertDialog/index.tsx': {
    reason:
      '同入口包含 AppAlertDialogBody、AppAlertDialogFooter 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:AppAlertDialogBody', 'multiple:AppAlertDialogFooter'],
  },
  'src/components/business/AppDisplayDialog/index.tsx': {
    reason:
      '同入口包含 AppDisplayDialogBody、AppDisplayDialogFooter 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:AppDisplayDialogBody', 'multiple:AppDisplayDialogFooter'],
  },
  'src/components/business/Chat/WelcomeConfigurable/Host/index.tsx': {
    reason:
      '同入口包含 WelcomeScreenHostBody、WelcomeScreenHostWithInputPrefill 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'privateImport:src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_common/context',
      'multiple:WelcomeScreenHostBody',
      'multiple:WelcomeScreenHostWithInputPrefill',
      'name:Host -> WelcomeScreenHost',
    ],
  },
  'src/components/business/Chat/WelcomeConfigurable/Host/index.type.ts': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_common/context/ChatInputStore.ts',
    ],
  },
  'src/components/business/Chat/WelcomeConfigurable/Starter/index.tsx': {
    reason:
      '同入口包含 QuestionPillButton、PillScrollStrip、WelcomeQuestionsSection、FeatureIconOrb、WelcomePromptCardsSection 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'multiple:QuestionPillButton',
      'multiple:PillScrollStrip',
      'multiple:WelcomeQuestionsSection',
      'multiple:FeatureIconOrb',
      'multiple:WelcomePromptCardsSection',
      'name:Starter -> WelcomeStarter',
    ],
  },
  'src/components/business/Chat/_hooks/useChatSessionController.ts': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/layouts/AppLayout/_common/store/useChatSessionHistoryRefreshStore.ts',
    ],
  },
  'src/components/business/Chat/_hooks/useNoteLinkResolver.ts': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/components/editors/note/_common/noteLinkProtocol.ts',
      'privateImport:src/components/editors/note/_common/store/useNoteExternalNavigationStore.ts',
    ],
  },
  'src/components/business/Chat/index.tsx': {
    reason:
      '根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。',
    diagnostics: ['member:src/components/business/Chat/WelcomeConfigurable/'],
  },
  'src/components/business/Chat/_parts/ChatConversation/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_common/context',
    ],
  },
  'src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_hooks/useChatInputController/index.ts':
    {
      reason:
        '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
      diagnostics: [
        'privateImport:src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_parts/VoiceInput/_hooks/useVoiceInput.ts',
      ],
    },
  'src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/index.tsx': {
    reason:
      '同入口包含 ChatInputContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:ChatInputContent'],
  },
  'src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_parts/AgentPicker/index.tsx':
    {
      reason:
        '同入口包含 AgentMenuSkeleton、GroupAgentPickerModal、GroupAgentPickerModalContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
      diagnostics: [
        'multiple:AgentMenuSkeleton',
        'multiple:GroupAgentPickerModal',
        'multiple:GroupAgentPickerModalContent',
      ],
    },
  'src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_parts/DocumentPickerModal/index.tsx':
    {
      reason:
        '同入口包含 DocumentPickerContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
      diagnostics: ['multiple:DocumentPickerContent'],
    },
  'src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_parts/OtherSkillModal/index.tsx':
    {
      reason:
        '同入口包含 OtherSkillModalContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
      diagnostics: ['multiple:OtherSkillModalContent'],
    },
  'src/components/business/Chat/_parts/ChatConversation/_parts/ChatInput/_parts/SkillMenu/index.tsx':
    {
      reason:
        '同入口包含 SkillMenuSkeleton 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
      diagnostics: ['multiple:SkillMenuSkeleton'],
    },
  'src/components/business/Chat/_parts/ChatConversation/_parts/ChatMessageList/_parts/Message/_parts/ChatMessage/index.tsx':
    {
      reason:
        '同入口包含 ChatMessageAssistant、ChatMessageUser、ChatMessageAvatar、ChatMessageMeta、ChatMessageBody、ChatMessageBubble、ChatMessageContent、ChatMessageActions 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
      diagnostics: [
        'multiple:ChatMessageAssistant',
        'multiple:ChatMessageUser',
        'multiple:ChatMessageAvatar',
        'multiple:ChatMessageMeta',
        'multiple:ChatMessageBody',
        'multiple:ChatMessageBubble',
        'multiple:ChatMessageContent',
        'multiple:ChatMessageActions',
      ],
    },
  'src/components/business/Chat/_parts/ChatConversation/_parts/ChatMessageList/_parts/Message/_parts/User/index.tsx':
    {
      reason:
        '同入口包含 UserAttachmentChip、UserMessageAttachments 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
      diagnostics: [
        'multiple:UserAttachmentChip',
        'multiple:UserMessageAttachments',
        'name:User -> UserMessage',
      ],
    },
  'src/components/business/Chat/_parts/ChatConversation/_parts/ChatMessageList/_parts/MessageHistoryNavigator/index.tsx':
    {
      reason:
        '同入口包含 HistoryBar 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
      diagnostics: ['multiple:HistoryBar'],
    },
  'src/components/business/CommandPalette/ResourceSearchResults.tsx': {
    reason:
      '保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/business/CommandPalette/ResourceSearchResults.tsx (ResourceResultItem)',
      'entry:src/components/business/CommandPalette/ResourceSearchResults.tsx (ResourceSearchResults)',
    ],
  },
  'src/components/business/CommandPalette/index.tsx': {
    reason:
      '根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。',
    diagnostics: ['member:src/components/business/CommandPalette/ResourceSearchResults.tsx'],
  },
  'src/components/business/Drive/DriveBrowser/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: ['privateImport:src/layouts/MainShell/_common/context'],
  },
  'src/components/business/Drive/MobileDrive/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/components/business/Drive/TableDrive/_common/tableConfig.ts',
      'privateImport:src/components/business/Drive/TableDrive/_hooks',
    ],
  },
  'src/components/business/Drive/Modals/DriveFolderPickerModal/index.tsx': {
    reason:
      '同入口包含 DriveFolderPickerDialog 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:DriveFolderPickerDialog'],
  },
  'src/components/business/Drive/Modals/RenameNodeModal/index.tsx': {
    reason:
      '同入口包含 RenameNodeModalContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:RenameNodeModalContent'],
  },
  'src/components/business/Drive/Modals/TagPermissionModal/index.tsx': {
    reason:
      '同入口包含 TagPolicyModalBase、TagMountPermissionModal 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:TagPolicyModalBase', 'multiple:TagMountPermissionModal'],
  },
  'src/components/business/Drive/Modals/TrashDeleteModal/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/components/editors/note/_common/store/useNewNoteStore.ts',
      'privateImport:src/components/editors/pdf/_parts/PdfViewer/_common/store/usePdfPreviewProgressStore.ts',
    ],
  },
  'src/components/business/Drive/TableDrive/_hooks/useTableDriveActionsController.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/components/editors/note/_common/store/useNewNoteStore.ts',
      'privateImport:src/components/editors/note/_hooks/useMarkdownNoteImport.ts',
    ],
  },
  'src/components/business/Drive/TableDrive/_parts/CreateMenu/index.tsx': {
    reason:
      '同入口包含 CreateMenuIcon 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:CreateMenuIcon'],
  },
  'src/components/business/Drive/TableDrive/_parts/DriveDetailPanel/index.tsx': {
    reason:
      '同入口包含 DetailMetaLoading 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:DetailMetaLoading'],
  },
  'src/components/business/Drive/TableDrive/_parts/DriveDnd/index.tsx': {
    reason:
      '同入口包含 DriveDroppableBreadcrumb、ExternalFileDroppableBreadcrumb、DriveDragOverlay 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'publicType:DriveDndRowElementProps',
      'publicType:DriveDndRowProps',
      'name:DriveDnd -> DriveDndRow',
      'publicType:DriveDroppableBreadcrumbProps',
      'multiple:DriveDroppableBreadcrumb',
      'publicType:ExternalFileDroppableBreadcrumbProps',
      'multiple:ExternalFileDroppableBreadcrumb',
      'publicType:DriveDragOverlayProps',
      'multiple:DriveDragOverlay',
    ],
  },
  'src/components/business/ErrorPage/ErrorPage.tsx': {
    reason:
      '错误页模块的公共 barrel 同时导出错误模型、页面和外壳；需先确定公共组件入口与纯模型 owner，再替换同名扁平入口。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: ['entry:src/components/business/ErrorPage/ErrorPage.tsx (ErrorPage)'],
  },
  'src/components/business/Group/DefaultAccessPermissionModal/index.tsx': {
    reason:
      '同入口包含 DefaultMemberScopePreview 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'multiple:DefaultMemberScopePreview',
      'name:DefaultAccessPermissionModal -> GroupDefaultAccessPermissionModal',
    ],
  },
  'src/components/business/Group/MemberList/Modals/AssignQuotaModal.tsx': {
    reason:
      '保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/business/Group/MemberList/Modals/AssignQuotaModal.tsx (QuotaInput)',
      'entry:src/components/business/Group/MemberList/Modals/AssignQuotaModal.tsx (AssignQuotaModal)',
    ],
  },
  'src/components/business/Group/MemberList/index.tsx': {
    reason:
      '根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。',
    diagnostics: ['member:src/components/business/Group/MemberList/Modals/'],
  },
  'src/components/business/InlineComment/index.tsx': {
    reason:
      '同入口包含 CommentItem、ResolvedCommentThread、CommentThread 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: [
      'multiple:CommentItem',
      'multiple:ResolvedCommentThread',
      'multiple:CommentThread',
    ],
  },
  'src/components/business/Resource/ResourcePermissionPanel/index.tsx': {
    reason:
      '同入口包含 SubjectPermissionPopover、PermissionPanelSkeleton 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:SubjectPermissionPopover', 'multiple:PermissionPanelSkeleton'],
  },
  'src/components/business/Sidebar/Sidebar.stories.tsx': {
    reason:
      '既有 story 直接组装内部叶子组件；将叶子 story 移至对应 owner 内或改用公开入口，避免为演示增加运行时转发。',
    diagnostics: [
      'privateImport:src/components/business/Sidebar/_common/tab/_parts/CourseTab',
      'privateImport:src/components/business/Sidebar/_common/tab/_parts/DriveTab',
      'privateImport:src/components/business/Sidebar/_common/tab/_parts/SessionTab',
    ],
  },
  'src/components/business/Sidebar/SidebarLeaf.stories.tsx': {
    reason:
      '既有 story 直接组装内部叶子组件；将叶子 story 移至对应 owner 内或改用公开入口，避免为演示增加运行时转发。',
    diagnostics: [
      'privateImport:src/components/business/Sidebar/_common/tab/_parts/DriveTab/_parts/SidebarDriveNodeTitle',
      'privateImport:src/components/business/Sidebar/_common/tab/_parts/DriveTab/_parts/SidebarDriveScopeSwitcher',
      'privateImport:src/components/business/Sidebar/_common/tab/_parts/SessionTab/_parts/SessionMenuItem',
      'privateImport:src/components/business/Sidebar/AdminSidebar/_parts/AdminHeaderNav',
    ],
  },
  'src/components/business/Sidebar/_common/tab/index.tsx': {
    reason:
      '同入口包含 SidebarViewTab 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/business/Sidebar/_common/tab/index.tsx',
      'multiple:SidebarViewTab',
      'name:tab -> AppSidebarTabs',
    ],
  },
  'src/components/business/Sidebar/_common/tab/_parts/DriveTab/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: ['privateImport:src/components/editors/note/_hooks/useMarkdownNoteImport.ts'],
  },
  'src/components/business/Sidebar/_common/tab/_parts/SessionTab/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/layouts/AppLayout/_common/store/useChatSessionHistoryRefreshStore.ts',
    ],
  },
  'src/components/business/WorkspacePanel/WorkspacePanel.tsx': {
    reason:
      '布局模块同时公开组件、槽位或共享协议；需先拆分模块公共入口与单组件入口，再规范文件结构，保留现有调用契约。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/business/WorkspacePanel/WorkspacePanel.tsx (WorkspacePanelHeader)',
      'entry:src/components/business/WorkspacePanel/WorkspacePanel.tsx (WorkspacePanel)',
    ],
  },
  'src/components/editors/ResourceEditor.tsx': {
    reason:
      '编辑器入口组合会话加载、展示绑定与多个 UI 分支；需按编辑会话协议确定入口、类型和私有 part，再调整资源类型注册路径。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/ResourceEditor.tsx (MountedEditor)',
      'entry:src/components/editors/ResourceEditor.tsx (ResourceEditor)',
    ],
  },
  'src/components/editors/_runtime/EditorPresentationBinding/PresentationSlot.tsx': {
    reason:
      '编辑器展示槽位同时公开工厂、Portal 与 Target；先划分公共运行时协议和 UI 入口，再规范组件目录，保持槽位实例与生命周期。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/_runtime/EditorPresentationBinding/PresentationSlot.tsx (PresentationSlotTarget)',
    ],
  },
  'src/components/editors/_runtime/EditorPresentationBinding/index.tsx': {
    reason:
      '编辑器展示槽位同时公开工厂、Portal 与 Target；先划分公共运行时协议和 UI 入口，再规范组件目录，保持槽位实例与生命周期。 根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。',
    diagnostics: [
      'member:src/components/editors/_runtime/EditorPresentationBinding/PresentationSlot.tsx',
      'member:src/components/editors/_runtime/EditorPresentationBinding/createPresentationSlot.tsx',
    ],
  },
  'src/components/editors/agent/index.tsx': {
    reason:
      '编辑器入口组合会话加载、展示绑定与多个 UI 分支；需按编辑会话协议确定入口、类型和私有 part，再调整资源类型注册路径。 同入口包含 AgentEditorContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/agent/index.tsx',
      'multiple:AgentEditorContent',
      'name:agent -> AgentEditor',
    ],
  },
  'src/components/editors/drawio/index.tsx': {
    reason:
      '编辑器入口组合会话加载、展示绑定与多个 UI 分支；需按编辑会话协议确定入口、类型和私有 part，再调整资源类型注册路径。 同入口包含 DrawioPresentationBinding、SaveStatusText、VersionModal、DrawioViewConnected、DrawioEditorContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/drawio/index.tsx',
      'multiple:DrawioPresentationBinding',
      'multiple:SaveStatusText',
      'multiple:VersionModal',
      'multiple:DrawioViewConnected',
      'multiple:DrawioEditorContent',
      'name:drawio -> DrawioEditor',
    ],
  },
  'src/components/editors/html/index.tsx': {
    reason:
      '编辑器入口组合会话加载、展示绑定与多个 UI 分支；需按编辑会话协议确定入口、类型和私有 part，再调整资源类型注册路径。 同入口包含 HtmlFrame、HtmlPageContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/html/index.tsx',
      'multiple:HtmlFrame',
      'multiple:HtmlPageContent',
      'name:html -> HtmlEditor',
    ],
  },
  'src/components/editors/note/CustomBlockNote/NoteEditorSession.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/NoteEditorSession.tsx (NoteEditorSession)',
      'entry:src/components/editors/note/CustomBlockNote/NoteEditorSession.tsx (NoteEditorSessionRuntime)',
      'entry:src/components/editors/note/CustomBlockNote/NoteEditorSession.tsx (NoteEditorSlot)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/engines/aiDiff/BulkActions.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/engines/aiDiff/BulkActions.tsx (AiDiffBulkActions)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 同入口包含 CustomBlockNoteRuntime 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: [
      'member:src/components/editors/note/CustomBlockNote/NoteEditorSession.tsx',
      'member:src/components/editors/note/CustomBlockNote/engines/',
      'member:src/components/editors/note/CustomBlockNote/plugins/',
      'member:src/components/editors/note/CustomBlockNote/registry/',
      'member:src/components/editors/note/CustomBlockNote/runtime/',
      'member:src/components/editors/note/CustomBlockNote/session/',
      'member:src/components/editors/note/CustomBlockNote/styles/',
      'member:src/components/editors/note/CustomBlockNote/ui/',
      'member:src/components/editors/note/CustomBlockNote/useNoteEditorStatus.ts',
      'multiple:CustomBlockNoteRuntime',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/CodeBlockToolbar.stories.tsx':
    {
      reason:
        'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 清单所列样式被不同组件借用；确认公共样式 owner 后上提共享部分，保持选择器与 Portal/编辑器作用域。',
      diagnostics: ['privateStyle:src/components/editors/note/CustomBlockNote/style.module.scss'],
    },
  'src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/CodeBlockToolbar.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/CodeBlockToolbar.tsx (CodeBlockToolbar)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。',
    diagnostics: [
      'member:src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/AiDiffView.ts',
      'member:src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/CodeBlockToolbar.tsx',
      'member:src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/highlight.ts',
      'member:src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/language.ts',
      'member:src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/lineDiff.ts',
      'member:src/components/editors/note/CustomBlockNote/plugins/CodeBlockPlugin/styles/',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/EmojiPlugin/EmojiPickerPopover.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/plugins/EmojiPlugin/EmojiPickerPopover.tsx (NoteEmojiPickerPopover)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/HighlightBlockPlugin/HighlightBlock/index.tsx':
    {
      reason:
        'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 同入口包含 HighlightIconPicker、HighlightBlockView、HighlightBlockToExternalHTML 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
      diagnostics: [
        'publicType:HighlightBlockRenderProps',
        'multiple:HighlightIconPicker',
        'multiple:HighlightBlockView',
        'multiple:HighlightBlockToExternalHTML',
      ],
    },
  'src/components/editors/note/CustomBlockNote/plugins/HighlightBlockPlugin/aiDiff.ts': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 清单所列样式被不同组件借用；确认公共样式 owner 后上提共享部分，保持选择器与 Portal/编辑器作用域。',
    diagnostics: [
      'privateStyle:src/components/editors/note/CustomBlockNote/plugins/HighlightBlockPlugin/HighlightBlock/style.module.scss',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/InlineMath/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 同入口包含 InlineMathFormulaPreview、InlineMathView、InlineMathExportHTML 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: [
      'member:src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/InlineMath/inlineMathDollarExtension.ts',
      'multiple:InlineMathFormulaPreview',
      'inlineType:InlineMathFormulaPreview',
      'multiple:InlineMathView',
      'multiple:InlineMathExportHTML',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/LatexEditPopover/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 清单所列样式被不同组件借用；确认公共样式 owner 后上提共享部分，保持选择器与 Portal/编辑器作用域。',
    diagnostics: [
      'member:src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/LatexEditPopover/latexPopoverGeometry.ts',
      'member:src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/LatexEditPopover/useFocusPopoverTextarea.ts',
      'member:src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/LatexEditPopover/useLatexPopoverAnchorSync.ts',
      'privateStyle:src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/InlineMath/style.module.scss',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/MathBlock/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 同入口包含 MathFormulaPreview、MathBlockView、MathBlockToExternalHTML 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 清单所列样式被不同组件借用；确认公共样式 owner 后上提共享部分，保持选择器与 Portal/编辑器作用域。',
    diagnostics: [
      'privateStyle:src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/InlineMath/style.module.scss',
      'publicType:MathBlockProps',
      'publicType:MathBlockRenderProps',
      'multiple:MathFormulaPreview',
      'inlineType:MathFormulaPreview',
      'multiple:MathBlockView',
      'publicType:MathBlockExternalProps',
      'multiple:MathBlockToExternalHTML',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/aiDiff.ts': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 清单所列样式被不同组件借用；确认公共样式 owner 后上提共享部分，保持选择器与 Portal/编辑器作用域。',
    diagnostics: [
      'privateStyle:src/components/editors/note/CustomBlockNote/plugins/LatexPlugin/MathBlock/style.module.scss',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/MermaidPlugin/MermaidAiDiffPanel.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 清单所列样式被不同组件借用；确认公共样式 owner 后上提共享部分，保持选择器与 Portal/编辑器作用域。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'privateStyle:src/components/editors/note/CustomBlockNote/plugins/MermaidPlugin/MermaidBlock/style.module.scss',
      'entry:src/components/editors/note/CustomBlockNote/plugins/MermaidPlugin/MermaidAiDiffPanel.tsx (MermaidAiDiffPanel)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/MermaidPlugin/MermaidBlock/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 同入口包含 MermaidBlockView、MermaidBlockToExternalHTML 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: [
      'publicType:MermaidBlockRenderProps',
      'multiple:MermaidBlockView',
      'multiple:MermaidBlockToExternalHTML',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/MermaidPlugin/aiDiff.ts': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 清单所列样式被不同组件借用；确认公共样式 owner 后上提共享部分，保持选择器与 Portal/编辑器作用域。',
    diagnostics: [
      'privateStyle:src/components/editors/note/CustomBlockNote/plugins/MermaidPlugin/MermaidBlock/style.module.scss',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/TableToolbar.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/TableToolbar.tsx (TableStructureActions)',
      'entry:src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/TableToolbar.tsx (TableCellBackgroundAction)',
      'entry:src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/TableToolbar.tsx (TableDeleteAction)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/tableHandles/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 同入口包含 NoteTableCellHandle、TableInsertHandles、MountedTableInsertHandles 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/tableHandles/index.tsx',
      'member:src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/tableHandles/railSelectionState.ts',
      'member:src/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/tableHandles/safe.ts',
      'multiple:NoteTableCellHandle',
      'multiple:TableInsertHandles',
      'multiple:MountedTableInsertHandles',
      'name:tableHandles -> NoteTableHandles',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/NoteEditorSurface.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/NoteEditorSurface.tsx (NoteFindBar)',
      'entry:src/components/editors/note/CustomBlockNote/ui/NoteEditorSurface.tsx (NoteAiDiffControls)',
      'entry:src/components/editors/note/CustomBlockNote/ui/NoteEditorSurface.tsx (NoteEditorSurface)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/editorMenus/colorPalette.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/editorMenus/colorPalette.tsx (ColorSection)',
      'entry:src/components/editors/note/CustomBlockNote/ui/editorMenus/colorPalette.tsx (ColorPaletteContent)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/findBar/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/findBar/index.tsx',
      'name:findBar -> FindBar',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/sideMenu/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 同入口包含 MenuItemContent、MenuSwitch、QuickBlockTypes、CustomSideMenu 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/sideMenu/index.tsx',
      'multiple:MenuItemContent',
      'inlineType:MenuItemContent',
      'multiple:MenuSwitch',
      'inlineType:MenuSwitch',
      'multiple:QuickBlockTypes',
      'inlineType:QuickBlockTypes',
      'multiple:CustomSideMenu',
      'inlineType:CustomSideMenu',
      'name:sideMenu -> NoteSideMenu',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/slashMenu/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 同入口包含 SlashMenuState、NoteSuggestionMenuList、NoteSuggestionMenu 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/slashMenu/index.tsx',
      'member:src/components/editors/note/CustomBlockNote/ui/slashMenu/buildSlashMenuItems.ts',
      'member:src/components/editors/note/CustomBlockNote/ui/slashMenu/slashMenuModel.ts',
      'member:src/components/editors/note/CustomBlockNote/ui/slashMenu/slashMenuView.tsx',
      'member:src/components/editors/note/CustomBlockNote/ui/slashMenu/useSlashMenuNavigation.ts',
      'multiple:SlashMenuState',
      'inlineType:SlashMenuState',
      'multiple:NoteSuggestionMenuList',
      'inlineType:NoteSuggestionMenuList',
      'multiple:NoteSuggestionMenu',
      'name:slashMenu -> NoteSlashMenu',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/slashMenu/slashMenuView.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/slashMenu/slashMenuView.tsx (SlashMenuItemContent)',
      'entry:src/components/editors/note/CustomBlockNote/ui/slashMenu/slashMenuView.tsx (SlashMenuDropdownItems)',
      'entry:src/components/editors/note/CustomBlockNote/ui/slashMenu/slashMenuView.tsx (SlashMenuListBoxItems)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/toolbar/components/BlockTypeMenu.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/BlockTypeMenu.tsx (BlockTypeDropdownItem)',
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/BlockTypeMenu.tsx (BlockTypeMenu)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/toolbar/components/ColorMenu.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/ColorMenu.tsx (ColorMenu)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/toolbar/components/FileButtons.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/FileButtons.tsx (FileCaptionToolbarButton)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/toolbar/components/LinkButton.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/LinkButton.tsx (CreateLinkToolbarButton)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/toolbar/components/NestButtons.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/NestButtons.tsx (NestButton)',
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/NestButtons.tsx (NestButtons)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/toolbar/components/TextAlignButtons.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/TextAlignButtons.tsx (TextAlignButtons)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/toolbar/components/TextStyleButtons.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/TextStyleButtons.tsx (TextStyleButtons)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/toolbar/components/ToolbarButton.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/ToolbarButton.tsx (ToolbarButton)',
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/components/ToolbarButton.tsx (ToolbarToggleButton)',
    ],
  },
  'src/components/editors/note/CustomBlockNote/ui/toolbar/index.tsx': {
    reason:
      'BlockNote 的插件 spec、编辑会话与 UI 协议相互依赖；先确认该模块的 UI 入口与运行时导出，再拆 _parts/_hooks/_common，保留插件注册和泛型推导。 同入口包含 ToolbarSeparator、CustomFormattingToolbar、TextSelectionFormattingToolbar、TableRailFormattingToolbar 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/CustomBlockNote/ui/toolbar/index.tsx',
      'member:src/components/editors/note/CustomBlockNote/ui/toolbar/components/',
      'member:src/components/editors/note/CustomBlockNote/ui/toolbar/useFloatingToolbarState.ts',
      'member:src/components/editors/note/CustomBlockNote/ui/toolbar/utils.ts',
      'multiple:ToolbarSeparator',
      'publicType:CustomFormattingToolbarProps',
      'multiple:CustomFormattingToolbar',
      'publicType:TextSelectionFormattingToolbarProps',
      'multiple:TextSelectionFormattingToolbar',
      'publicType:TableRailFormattingToolbarProps',
      'multiple:TableRailFormattingToolbar',
      'name:toolbar -> NoteToolbar',
    ],
  },
  'src/components/editors/note/index.tsx': {
    reason:
      '编辑器入口组合会话加载、展示绑定与多个 UI 分支；需按编辑会话协议确定入口、类型和私有 part，再调整资源类型注册路径。 同入口包含 NoteOpenFailure、NoteInfoLoading、NoteEditorContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/note/index.tsx',
      'member:src/components/editors/note/CustomBlockNote/',
      'member:src/components/editors/note/mock/',
      'multiple:NoteOpenFailure',
      'multiple:NoteInfoLoading',
      'multiple:NoteEditorContent',
      'name:note -> NoteEditor',
    ],
  },
  'src/components/editors/office/index.tsx': {
    reason:
      '编辑器入口组合会话加载、展示绑定与多个 UI 分支；需按编辑会话协议确定入口、类型和私有 part，再调整资源类型注册路径。 同入口包含 OfficePresentationBinding、OfficeEditorHost、OfficeEditorContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/office/index.tsx',
      'multiple:OfficePresentationBinding',
      'multiple:OfficeEditorHost',
      'multiple:OfficeEditorContent',
      'name:office -> OfficeEditor',
    ],
  },
  'src/components/editors/pdf/index.tsx': {
    reason:
      '编辑器入口组合会话加载、展示绑定与多个 UI 分支；需按编辑会话协议确定入口、类型和私有 part，再调整资源类型注册路径。 同入口包含 PdfPresentationBinding、PdfEditorContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/pdf/index.tsx',
      'member:src/components/editors/pdf/mock/',
      'multiple:PdfPresentationBinding',
      'multiple:PdfEditorContent',
      'name:pdf -> PdfEditor',
    ],
  },
  'src/components/editors/skill/index.tsx': {
    reason:
      '编辑器入口组合会话加载、展示绑定与多个 UI 分支；需按编辑会话协议确定入口、类型和私有 part，再调整资源类型注册路径。 同入口包含 SkillEditorContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/components/editors/skill/index.tsx',
      'multiple:SkillEditorContent',
      'name:skill -> SkillEditor',
    ],
  },
  'src/components/editors/skill/_parts/SkillSaveQueueDock/index.tsx': {
    reason:
      '编辑器入口组合会话加载、展示绑定与多个 UI 分支；需按编辑会话协议确定入口、类型和私有 part，再调整资源类型注册路径。 同入口包含 QueuePhaseIcon 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:QueuePhaseIcon'],
  },
  'src/hooks/useOpenResource.ts': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/components/editors/pdf/_parts/PdfViewer/_common/store/usePdfPreviewProgressStore.ts',
    ],
  },
  'src/layouts/App/AppPageLayout.tsx': {
    reason:
      '布局模块同时公开组件、槽位或共享协议；需先拆分模块公共入口与单组件入口，再规范文件结构，保留现有调用契约。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/layouts/App/AppPageLayout.tsx (AppScrollablePageLayout)',
      'entry:src/layouts/App/AppPageLayout.tsx (AppFixedPageLayout)',
    ],
  },
  'src/layouts/Course/CourseLearningLayout/index.tsx': {
    reason:
      '同入口包含 CourseLearningLayoutContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:CourseLearningLayoutContent'],
  },
  'src/layouts/Course/CourseLearningLayout/_parts/CourseOutlineSidebar/index.tsx': {
    reason:
      '同入口包含 CourseOutlineResourcePageTitle 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:CourseOutlineResourcePageTitle'],
  },
  'src/layouts/Resource/ResourceHost/index.tsx': {
    reason:
      '同入口包含 ResourceHostContent 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。 既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: [
      'privateImport:src/layouts/MainShell/_common/context',
      'multiple:ResourceHostContent',
    ],
  },
  'src/layouts/Resource/ResourceLayout/ResourceLayout.tsx': {
    reason:
      '布局模块同时公开组件、槽位或共享协议；需先拆分模块公共入口与单组件入口，再规范文件结构，保留现有调用契约。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: ['entry:src/layouts/Resource/ResourceLayout/ResourceLayout.tsx (ResourceLayout)'],
  },
  'src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceToolbarActions.tsx': {
    reason:
      '保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceToolbarActions.tsx (ResourceToolbarMenuItemContent)',
      'entry:src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceToolbarActions.tsx (ResourceToolbarMore)',
      'entry:src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceToolbarActions.tsx (ResourceToolbarActions)',
    ],
  },
  'src/layouts/Resource/ResourceLayout/ResourceToolbar/index.tsx': {
    reason:
      '根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。',
    diagnostics: [
      'member:src/layouts/Resource/ResourceLayout/ResourceToolbar/ResourceToolbarActions.tsx',
    ],
  },
  'src/layouts/RouteOutletBoundary/index.tsx': {
    reason:
      '同入口包含 RouteOutletFallback 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:RouteOutletFallback'],
  },
  'src/layouts/WorkspaceRightPanelLayout/WorkspaceRightPanelLayout.tsx': {
    reason:
      '布局模块同时公开组件、槽位或共享协议；需先拆分模块公共入口与单组件入口，再规范文件结构，保留现有调用契约。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/layouts/WorkspaceRightPanelLayout/WorkspaceRightPanelLayout.tsx (WorkspaceRightPanelLayout)',
    ],
  },
  'src/views/app/chat/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。 保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/views/app/chat/index.tsx',
      'privateImport:src/layouts/MainShell/_common/context',
      'name:chat -> ChatPage',
    ],
  },
  'src/views/app/course/CourseMembersPage/index.tsx': {
    reason:
      '同入口包含 TeacherCourseMembersView、StudentCourseMembersView 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:TeacherCourseMembersView', 'multiple:StudentCourseMembersView'],
  },
  'src/views/app/drive/_components/UploadQueueTab/index.tsx': {
    reason:
      '同入口包含 UploadProgressCell 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: ['multiple:UploadProgressCell'],
  },
  'src/views/app/group/GroupDetail/_guards/GroupWalletRouteGuard/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: ['privateImport:src/views/app/group/GroupRoute/_common/context'],
  },
  'src/views/app/group/GroupDetail/_pages/GroupFilesPage/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: ['privateImport:src/views/app/group/GroupRoute/_common/context'],
  },
  'src/views/app/group/GroupDetail/_pages/GroupMembersPage/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: ['privateImport:src/views/app/group/GroupRoute/_common/context'],
  },
  'src/views/app/group/GroupDetail/_pages/GroupSettingsPage/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: ['privateImport:src/views/app/group/GroupRoute/_common/context'],
  },
  'src/views/app/group/GroupDetail/_pages/GroupTokenTransferPage/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: ['privateImport:src/views/app/group/GroupRoute/_common/context'],
  },
  'src/views/app/group/GroupDetail/_pages/GroupWalletPage/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。',
    diagnostics: ['privateImport:src/views/app/group/GroupRoute/_common/context'],
  },
  'src/views/app/group/GroupDetail/index.tsx': {
    reason:
      '既有调用跨越了清单所列组件的私有边界；需将共享状态或行为提升到共同公共 owner，并审查消费、重置与生命周期后迁移调用方。 根部仍混合公共模块、UI 或辅助实现；确认每个所列成员的归属后迁入 _parts/_hooks/_common，更新全部引用并移除旧路径。',
    diagnostics: [
      'member:src/views/app/group/GroupDetail/_guards/',
      'member:src/views/app/group/GroupDetail/_pages/',
      'privateImport:src/views/app/group/GroupRoute/_common/context',
    ],
  },
  'src/views/app/notifications/index.tsx': {
    reason:
      '保留既有公开名或注册入口；统一 PascalCase 组件目录与主导出并同步调用方，删除旧入口，不添加兼容转发。',
    diagnostics: [
      'entry:src/views/app/notifications/index.tsx',
      'name:notifications -> NotificationsPage',
    ],
  },
  'src/views/app/profile/Appearance/index.tsx': {
    reason:
      '同入口包含 LanguageSection、ThemeModeSection、ColorSchemeSection、SchemeOption、AppearanceHeader 等 UI 实现；先确认公开 compound 成员与私有 part 的边界，再逐个拆分并迁出对应 Props。',
    diagnostics: [
      'multiple:LanguageSection',
      'multiple:ThemeModeSection',
      'multiple:ColorSchemeSection',
      'multiple:SchemeOption',
      'multiple:AppearanceHeader',
    ],
  },
};
