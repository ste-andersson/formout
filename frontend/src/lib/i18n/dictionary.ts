import type { FieldType } from '../formSchema'
import type { FormStatus } from '../adminApi'
import type { ColorSchemeId } from '../colorScheme'

// The shape of the app's translation dictionary. Nested one section per
// file/feature (not flat dotted keys) so a given file's strings live under
// one predictable key, and `t.section.key` gets full autocomplete/typo
// checking from TypeScript with no hand-rolled lookup machinery. sv.ts and
// en.ts are each checked against this with `satisfies Dictionary`, so a
// missing or extra key in either language fails the build.
export interface Dictionary {
  common: {
    cancel: string
    close: string
    loading: string
    back: string
  }
  colorScheme: Record<ColorSchemeId, string>
  fieldType: Record<FieldType, string>
  fieldTypeGroup: {
    content: string
    answerTypes: string
  }
  // Placeholder content pre-filled when an admin adds a new field in the
  // builder -- authoring-time convenience text (expected to be overwritten),
  // not respondent-facing form content, so it's translated like any other
  // app-chrome string rather than left permanently Swedish.
  fieldDefaults: {
    labels: Record<FieldType, string>
    options: readonly [string, string]
  }
  formStatus: Record<FormStatus, string>
  formAnswers: {
    requiredField: string
  }
  settingsMenu: {
    trigger: string
    languageSectionLabel: string
    offlineLabel: string
    offlineAuthHint: string
    passwordLabel: string
    passwordHint: string
    modeSectionLabel: string
    themeLight: string
    themeDark: string
    themeSystem: string
    schemeSectionLabel: string
  }
  header: {
    mainNav: string
    fillIn: string
    create: string
  }
  errorBoundary: {
    title: string
    message: string
    reload: string
  }
  formFiller: {
    requiredFieldsToast: string
    backHome: string
  }
  formRenderer: {
    emptyForm: string
  }
  formViewer: {
    loading: string
    notFoundTitle: string
    notFoundMessage: string
    errorMessage: string
    submitLabel: string
    savingLabel: string
    successToast: string
    errorToast: string
    savedTitle: string
    savedMessage: string
    edit: string
  }
  responseEditor: {
    loading: string
    notFoundTitle: string
    errorMessage: string
    deleteSuccessToast: string
    deleteErrorToast: string
    remove: string
    formUnavailableMessage: string
    submitLabel: string
    savingLabel: string
    successToast: string
    errorToast: string
    savedTitle: string
    savedMessage: string
  }
  sharedResponse: {
    invalidLinkTitle: string
    invalidLinkMessage: string
    loading: string
    notFoundTitle: string
    notFoundMessage: string
    protectedNotice: string
    wrongPassword: string
    filledIn: (date: string) => string
  }
  shareFormLink: {
    shareButton: string
    shareFormTitle: string
    qrTitle: string
    copyCode: (slug: string) => string
    mailLink: string
    showQr: string
    copyLink: string
    mailBody: (link: string) => string
    linkCopiedToast: string
    linkCopyFailedToast: string
    codeCopiedToast: string
    codeCopyFailedToast: string
    publishFirstHint: string
    publishFirstToast: string
  }
  offlineAuthExceptionModal: {
    signInHeading: string
    signInAllow: string
    signInCancel: string
    enableOfflineHeading: string
    enableOfflineAllow: string
    enableOfflineCancel: string
    description: string
    moreInfo: string
    moreInfoDetails: string
  }
  offlineContentUnavailableModal: {
    title: string
    message: string
    disableOffline: string
  }
  passwordPromptModal: {
    setHeading: string
    setSubmit: string
    enterHeading: string
    enterSubmit: string
    placeholder: string
  }
  csvNotProtectableModal: {
    title: string
    message: string
    useXlsxInstead: string
    continueWithoutPassword: string
  }
  responseActions: {
    shareButton: string
    exportButton: string
    exportTitle: string
    shareTitle: string
    qrTitle: string
    mailLink: string
    showQr: string
    copyLink: string
    mailLinkHint: string
    qrHint: string
    mailSubjectBody: (url: string) => string
    shareFileFailedToast: string
    linkTooLongMailToast: string
    linkTooLongQrToast: string
    linkCopiedToast: string
    linkCopyFailedToast: string
  }
  respondentHome: {
    unknownForm: string
    removeFailedToast: string
    title: string
    offlineHint: string
    enterCodePrompt: string
    formCodeLabel: string
    loadFormButton: string
    loadFailedError: string
    offlineEmptyMessage: string
    myFormsHeading: string
    currentFormsHeading: string
    outdatedFormsHeading: string
    exportAllTitle: string
    shareAllTitle: string
    fetchingForm: string
    fetchFormFailed: string
    fillInAgain: string
    fillIn: string
    exportAll: string
    shareAll: string
    removeFormAriaLabel: string
    responsesHeading: string
  }
  sortableFieldItem: {
    dragHandle: string
    remove: string
  }
  fieldPreview: {
    minLabelPlaceholder: string
    maxLabelPlaceholder: string
    removeOption: string
    addOption: string
    required: string
    defaultOption: (n: number) => string
  }
  fieldCanvas: {
    emptyHint: string
  }
  adminHome: {
    title: string
    offlineHint: string
    uploadHintMobile: string
    uploadHintDesktop: string
    needAccountMessage: string
    signInButton: string
    photoUploadMobile: string
    photoUploadDesktop: string
    buildForm: string
    myFormsHeading: string
    loading: string
    loadFailedError: string
    noFormsYet: string
  }
  interpretationModal: {
    steps: readonly [string, string, string, string]
    hint: string
  }
  formEditor: {
    signInRequired: string
    loading: string
    loadFailedError: string
    interpretedToast: (wasFirstPage: boolean) => string
    interpretFailedMessage: (wasFirstPage: boolean) => string
    interpretFailedToast: (wasFirstPage: boolean) => string
    publishedToast: string
    publishFailedMessage: string
    publishFailedToast: string
    unpublishedToast: string
    deletedToast: string
    unpublishFailedToast: string
    deleteFailedToast: string
    markCurrentToast: string
    markOutdatedToast: string
    markCurrentFailedToast: string
    markOutdatedFailedToast: string
    heading: string
    offlineNotice: string
    dragHint: string
    titleLabel: string
    descriptionLabel: string
    codeLabel: string
    generateNewCode: string
    statusLabel: string
    publish: string
    unpublish: string
    relevanceLabel: string
    current: string
    outdated: string
    markOutdated: string
    markCurrent: string
    imageTab: string
    buildTab: string
    previewTab: string
    retry: string
    removePage: string
    pageLabel: (n: number) => string
    addPage: string
    enlargedImageAlt: string
    delete: string
  }
  exportChrome: {
    question: string
    answer: string
    filledIn: string
    field: string
    yes: string
    no: string
  }
}
