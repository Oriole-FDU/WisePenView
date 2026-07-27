const enUSSkill = {
  page: {
    createTitle: 'Create Skill',
    createAction: 'Create a new Skill',
    openFailed: 'Unable to open Skill',
    backToDrive: 'Back to Drive',
    loading: 'Loading Skill...',
    resourceFallbackName: 'Skill',
  },
  header: { cancelEditing: 'Cancel', edit: 'Edit', save: 'Save', publish: 'Publish' },
  saveStatus: {
    dirty: 'Unsaved changes',
    saving: 'Saving...',
    failed: 'Save failed',
    clean: 'Saved to the cloud',
  },
  config: {
    title: 'Config',
    ariaLabel: 'Skill configuration',
    introTitle: 'Skill Info',
    intro:
      'Enter a name and description to help the model understand when to use this Skill. Both fields are required for publishing.',
    nameAriaLabel: 'Skill name',
    nameLabel: 'name',
    nameDescription:
      'A stable name used by the model to identify this Skill, such as planning_with_files.',
    nameRequired: 'Enter a name.',
    namePlaceholder: 'planning_with_files',
    descriptionAriaLabel: 'Skill description',
    descriptionLabel: 'description',
    descriptionHelp:
      'Describe the tasks this Skill handles. A clear description helps the model select it correctly.',
    descriptionRequired: 'Enter a description.',
    descriptionPlaceholder: 'Describe the tasks this Skill handles',
    publishBlocked: 'Enter a name and description before publishing the Skill.',
    dirty: 'Configuration changes have not been applied',
    saved: 'Configuration is up to date',
    reset: 'Reset',
    update: 'Update configuration',
    badge: { required: 'Required', unsaved: 'Unsaved', complete: 'Complete' },
  },
  fileTree: {
    title: 'Files',
    deleteItem: 'Delete {{name}}',
    newFolder: 'New folder',
    newFile: 'New file',
    upload: 'Upload files',
    dropHint: 'Drop to upload files or a zip archive',
    emptyEditable: 'No files. Upload or create one to get started.',
    empty: 'No files',
  },
  preview: {
    markdownMode: 'Markdown display mode',
    preview: 'Preview',
    markdown: 'Markdown',
    unsupported:
      'This file type cannot be previewed. Its original contents will be preserved when saved.',
    selectFile: 'Select a file to edit',
  },
  queue: {
    title: 'Save queue',
    failedTitle: '{{count}} item failed to save',
    failedTitle_one: '{{count}} item failed to save',
    failedTitle_other: '{{count}} items failed to save',
    savingTitle: 'Saving {{done}}/{{total}}',
    pendingTitle: '{{count}} item waiting to save',
    pendingTitle_one: '{{count}} item waiting to save',
    pendingTitle_other: '{{count}} items waiting to save',
    idleHint: 'Nothing pending',
    failedHint: 'Retry or discard the changes',
    savingHint: 'Do not close this page',
    pendingHint: 'Files upload after you save',
    phase: { pending: 'Pending', preparing: 'Preparing', done: 'Done', failed: 'Failed' },
    resize: 'Resize save queue',
    retry: 'Retry',
    empty: 'No files are waiting to be saved or uploaded',
    interrupted: 'The previous save was interrupted. Save again.',
    resultMissing: 'The save result is missing. Try again.',
  },
  unsaved: {
    publish: {
      title: 'Save changes before publishing',
      description:
        'This Skill has unsaved changes. Save them first so they are included in the published version.',
      confirm: 'Save and publish',
    },
    leave: {
      title: 'Save before leaving?',
      description:
        'This Skill has unsaved changes. Save before leaving to avoid losing your edits.',
      confirm: 'Save and leave',
    },
    switchFile: {
      title: 'Save before switching files?',
      description:
        'This file has unsaved changes. Save before switching to avoid losing your edits.',
      confirm: 'Save and switch',
    },
    switchConfig: {
      title: 'Save before opening configuration?',
      description:
        'This file has unsaved changes. Save before opening configuration to avoid losing your edits.',
      confirm: 'Save and open',
    },
    switchVersion: {
      title: 'Save before switching versions?',
      description:
        'This Skill has unsaved content. Save before switching to avoid losing your edits.',
      confirm: 'Save and switch',
    },
  },
  delete: {
    folderTitle: 'Delete folder',
    fileTitle: 'Delete file',
    folderDescription:
      'Delete the folder “{{name}}” and all its contents? This action cannot be undone.',
    fileDescription: 'Delete the file “{{name}}”? This action cannot be undone.',
    confirm: 'Delete',
  },
  toast: {
    draftRestored: 'Restored your unsaved Skill draft',
    savingSwitchConfig: 'The Skill is being saved. Wait before switching to configuration.',
    savingSwitchFile: 'The Skill is being saved. Wait before switching files.',
    updateConfigBeforeDirectory: 'Apply or reset the configuration before switching directories.',
    saveSuccess: 'Saved successfully',
    configUpdated: 'Configuration updated',
    publishSuccess: 'Published successfully',
    deleteSuccess: 'Deleted successfully',
    savingPublish: 'The Skill is being saved. Wait before publishing.',
    missingMainFile:
      'Create and save an uppercase SKILL.md in the root directory before publishing.',
    missingConfig: 'Enter a name and description in Config before publishing.',
    savingSwitchVersion: 'The Skill is being saved. Wait before switching versions.',
    moveSuccess: 'Moved successfully',
    saveBeforeUpload: 'Save or discard the current changes before uploading files.',
    uploadSingleZip: 'Upload a zip archive by itself.',
    zipImported: 'The zip archive was imported. Save to apply the changes.',
    savingClearSelection: 'The Skill is being saved. Wait before clearing the selection.',
    saveBeforeClearSelection: 'Save or discard the current changes before clearing the selection.',
    updateConfigBeforeClearSelection:
      'Apply or reset the configuration before clearing the selection.',
  },
};

export default enUSSkill;
