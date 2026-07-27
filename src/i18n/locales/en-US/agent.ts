const enUSAgent = {
  common: {
    noDescription: 'No description',
    unavailable: 'Unavailable',
    done: 'Done',
    restorePreset: 'Restore preset',
  },
  page: {
    anchor: {
      basic: 'Basic info',
      prompt: 'System Prompt',
      model: 'Model',
      capabilities: 'Tools and Skills',
      memory: 'Memory',
      assets: 'Assets',
    },
    saveStatus: {
      dirty: 'Unsaved changes',
      saving: 'Saving...',
      failed: 'Save failed',
      clean: 'Saved to cloud',
    },
    saved: 'Agent saved',
    published: 'Agent published',
    publishAction: 'Publish',
    assetUploaded: 'Asset uploaded',
    assetDeleted: 'Asset deleted',
    switchVersionBlocked: 'Save or discard your changes before switching versions',
    currentAgent: 'Current Agent',
    createTitle: 'Create Agent',
    createAction: 'Create new Agent',
    openFailed: 'Unable to open Agent',
    backToDrive: 'Back to drive',
    loading: 'Loading Agent...',
    promptReset: {
      title: 'Guided editing is unavailable',
      description:
        'The preset heading structure in this System Prompt is invalid. Clearing it will delete the current content and rebuild it from the general preset.',
      cancel: 'Keep free editing',
      confirm: 'Clear and switch',
    },
    leave: {
      title: 'Save before leaving?',
      description:
        'This Agent has unsaved changes. Save before leaving to avoid losing your edits.',
      discard: 'Discard changes',
      confirm: 'Save and exit',
    },
    deleteAsset: {
      title: 'Delete asset',
      description: 'Delete this asset from the current Agent draft?',
    },
  },
  navigation: { aria: 'Agent configuration navigation', title: 'Agent configuration navigation' },
  basic: {
    title: 'Agent Info',
    description:
      'Set the internal Agent name and purpose. The resource title is managed in the drive.',
    nameHint: 'Use a stable English name.',
    descriptionHint: 'A clear description helps users understand what this Agent does.',
    descriptionPlaceholder: 'Summarize the tasks this Agent is suited for',
    autoTitle: 'Generate conversation titles',
    autoTitleDescription: 'Generate a short title from the first user message.',
  },
  model: {
    title: 'Model',
    description:
      'Choose the default model and whether users may switch models during a conversation.',
    default: 'Default model',
    defaultHint: 'Choose from models available to this account',
    allowSwitch: 'Allow model switching',
    allowSwitchDescription: 'When disabled, conversations always use the model above.',
  },
  memory: {
    title: 'Memory',
    description:
      'Control how the Agent uses the current conversation, conversation history, and long-term memory.',
    chat: 'Conversation memory',
    chatDescription: 'Use earlier messages from the current conversation to preserve context.',
    persist: 'Save conversation history',
    persistDescription: 'Continue after reopening the conversation.',
    summary: 'Summarize long conversations',
    summaryDescription: 'Compress earlier messages near the context limit.',
    longTerm: 'Long-term memory across conversations',
    longTermDescription: 'Use relevant facts and preferences in future conversations.',
    collapse: 'Hide settings',
    more: 'More settings',
    advanced: 'Advanced parameters',
    restore: 'Restore recommended preset',
    highWatermark: 'Summary trigger {{percent}}%',
    lowWatermark: 'Summary target {{percent}}%',
    recallLimit: 'Long-term memory recall count',
    scoreThreshold: 'Long-term memory relevance {{percent}}%',
    summaryPrompt: 'Summary prompt',
    summaryPlaceholder: 'Leave blank to use the WisePen default',
    restoreTitle: 'Restore recommended preset?',
    restoreDescription:
      'This restores the advanced parameters to WisePen recommended values. Modified ratios, recall count, relevance, and summary prompt will be overwritten. The four memory switches will not change.',
  },
  capabilities: {
    title: 'Tools and Skills',
    description: 'Configure the tools and specialized capabilities available to this Agent.',
    enableTool: 'Enable Tools',
    enableToolDescription: 'When disabled, all Tool and Skill settings are hidden and inactive.',
    allowTool: 'Allowed Tools',
    allowToolDescription: 'Add Tools this Agent may call',
    addAllowTool: 'Add allowed Tool',
    denyTool: 'Blocked Tools',
    denyToolDescription: 'Add Tools this Agent must not call',
    addDenyTool: 'Add blocked Tool',
    searchTool: 'Search Tool names or descriptions',
    noTool: 'No matching Tools',
    noSelectedTool: 'No Tools selected',
    enableSkill: 'Enable Skills',
    enableSkillDescription: 'When disabled, Skills are not provided to the Agent.',
    onDemandSkill: 'On-demand Skills',
    onDemandSkillDescription: 'Add Skills the Agent may load when relevant',
    addOnDemandSkill: 'Add on-demand Skill',
    forceSkill: 'Always-on Skills',
    forceSkillDescription: 'Add Skills loaded in every conversation',
    addForceSkill: 'Add always-on Skill',
    searchSkill: 'Search Skill names or descriptions',
    noSkill: 'No matching Skills',
    noSelectedSkill: 'No Skills selected',
    toolDisabled: 'This Tool is disabled',
    toolRequiresConfig: 'This Tool requires configuration',
    toolIncomplete: 'This Tool configuration is incomplete',
    alreadyForce: 'This Skill is already always enabled',
    alreadyOnDemand: 'This Skill is already on demand',
    missingOption: 'This item was not returned in the available options.',
    remove: 'Remove {{name}}',
  },
  assets: {
    title: 'Assets',
    description: 'Provide reference files and scripts saved with each Agent version.',
    upload: 'Upload assets',
    tableAria: 'Agent assets',
    file: 'File',
    typeAndSize: 'Type and size',
    status: 'Status',
    actions: 'Actions',
    empty: 'No assets',
    available: 'Available',
    uploading: 'Uploading',
    delete: 'Delete {{name}}',
    drop: 'Release to upload assets',
  },
  prompt: {
    title: 'System Prompt',
    description:
      'Maintain the preset through a guided form or switch to free editing for the complete Markdown.',
    modeAria: 'System Prompt editing mode',
    guided: 'Guided',
    free: 'Free edit',
    compatible: 'This content can return to guided editing',
    incompatible: 'This content cannot return to guided editing',
    agentDescription:
      'Define the purpose, workflow, output structure, and confirmation boundaries.',
    restore: 'Restore general preset',
    soulTitle: 'SOUL (optional)',
    soulDescription:
      'Define collaboration, communication, initiative, quality preferences, and boundaries.',
    soulAria: 'Enable SOUL',
    restoreTitle: 'Restore general preset?',
    restoreDescription:
      'This rebuilds the System Prompt from the general template and overwrites the current guided and SOUL content.',
    field: {
      overview: {
        label: 'Overview',
        description: 'What does this Agent do? When should and should it not be used?',
      },
      context: { label: 'Context', description: 'What background does it need?' },
      workflow: { label: 'Workflow', description: 'How should it approach tasks?' },
      outputFormat: { label: 'Output Format', description: 'How should it organize responses?' },
      exampleOutput: {
        label: 'Example Output',
        description: 'Provide a response skeleton that can be adapted to the task.',
      },
      qualityChecks: {
        label: 'Quality Checks',
        description: 'How should it ensure reliable results?',
      },
      whenToAsk: {
        label: 'When To Ask First',
        description: 'When must it ask the user before proceeding?',
      },
      soulRole: {
        label: 'Role & Relationship',
        description: 'How should it collaborate with the user?',
      },
      soulStyle: { label: 'Communication Style', description: 'How should it communicate?' },
      soulInitiative: { label: 'Initiative Level', description: 'How proactive should it be?' },
      soulTaste: { label: 'Quality Taste', description: 'What does it consider a good result?' },
      soulTruth: {
        label: 'Truth & Uncertainty',
        description: 'How should it handle evidence, inference, and uncertainty?',
      },
      soulBoundaries: { label: 'Boundaries', description: 'What must it never do?' },
    },
  },
  defaultPrompt: {
    overview:
      'This Agent helps users analyze problems, develop plans, write and review content, and complete concrete tasks. It is suited to work requiring structured reasoning, judgment, creation, revision, and execution. It should not make high-risk final decisions for the user or assert uncertain facts without evidence.',
    context:
      'Use information supplied by the user, conversation context, available attachments, and tool results. Do not assume background, permissions, or facts the user has not provided. Identify missing critical information.',
    workflow:
      'Clarify the goal and completion criteria, then decide whether the available information is sufficient. Handle simple tasks directly and break complex tasks into clear steps. Use available sources or tools when verification is needed, and check requirements, constraints, and next actions before finishing.',
    outputFormat:
      'Choose the structure best suited to the task. Lead with the conclusion or directly usable result, then provide necessary evidence, steps, limitations, and next actions. Do not add hierarchy that does not help.',
    exampleOutput:
      'Result:\nProvide content the user can use directly.\n\nKey evidence:\n- Explain important judgments, sources, or assumptions.\n\nNext steps:\n- List confirmations or actions that remain.',
    qualityChecks:
      'Before submitting, verify that the result fully addresses the goal, distinguishes facts from inference, supports key conclusions, follows the requested format, and contains no fabricated details, missed constraints, or contradictions.',
    whenToAsk:
      'Ask first when critical missing information would materially affect the result, when multiple choices would change its direction, or when an action carries high risk, is irreversible, affects privacy or permissions, or has external impact.',
    soulRole:
      'Act as a reliable collaborator, not merely a command executor. Respect the user’s judgment while calmly identifying risks or better paths when needed.',
    soulStyle:
      'Be concise, natural, and considerate, and direct when useful. Avoid bureaucracy, filler, excessive apologies, and pretending to know everything.',
    soulInitiative:
      'Proceed proactively with low-risk, reversible details. Ask before high-risk, irreversible, or direction-changing decisions.',
    soulTaste:
      'Prefer clear, well-structured, actionable, evidence-based results. Avoid needless complexity, excessive packaging, and polished language that does not help.',
    soulTruth:
      'Distinguish facts, inferences, and recommendations. Explain what is uncertain and how it can be verified.',
    soulBoundaries:
      'Do not fabricate, pretend to have seen unavailable content, disclose private information, manipulate the user, or sacrifice truth to be agreeable.',
  },
};

export default enUSAgent;
