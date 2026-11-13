const enUSSkill = {
  page: {
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
    nameAriaLabel: 'Skill name',
    nameLabel: 'Name',
    nameRequired: 'Enter a name.',
    namePlaceholder: 'planning_with_files',
    descriptionAriaLabel: 'Skill description',
    descriptionLabel: 'Description',
    descriptionRequired: 'Enter a description.',
    descriptionPlaceholder: 'Describe the tasks this Skill handles',
    dirty: 'Configuration changes have not been applied',
    reset: 'Reset',
    update: 'Update configuration',
    badge: { required: 'Required', unsaved: 'Unsaved', complete: 'Complete' },
    queuePath: 'Skill configuration',
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
    savingTitle: 'Saving {{total}} item(s)',
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
    switchVersion: {
      title: 'Save before switching versions?',
      description:
        'This Skill has unsaved content. Save before switching to avoid losing your edits.',
      confirm: 'Save and switch',
    },
    cancelEditing: {
      title: 'Exit editing?',
      description: 'There are unsaved changes. Exiting directly will discard them.',
      confirm: 'Save and exit',
      cancel: 'Continue editing',
      discard: 'Discard and exit',
    },
  },
  delete: {
    folderTitle: 'Delete folder',
    fileTitle: 'Delete file',
    folderDescription:
      'Delete the folder “{{name}}” and all its contents? This action cannot be undone.',
    fileDescription: 'Delete the file “{{name}}”? This action cannot be undone.',
    dirtyFolderDescription:
      'The folder “{{name}}” contains {{count}} unsaved file(s). Deleting it will permanently discard those changes.',
    dirtyFileDescription:
      'The file “{{name}}” has unsaved changes. Deleting it will permanently discard them.',
    confirm: 'Delete',
  },
  move: {
    dirtyTitle: 'Move unsaved files?',
    dirtyDescription:
      'Affected files are unsaved. Confirming the move will save them automatically.',
    confirm: 'Move',
  },
  toast: {
    draftRestored: 'Restored your unsaved Skill draft',
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
    moveInProgress: 'Files are being moved. Save after the move finishes.',
    uploadSingleZip: 'Upload a zip archive by itself.',
    zipImported: 'The zip archive was imported. Save to apply the changes.',
  },
};

export default enUSSkill;
