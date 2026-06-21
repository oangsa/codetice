const EDITOR_DRAFT_STORAGE_PREFIX = "codetice:editor-draft";

export function createEditorDraftStorageKey(questionId: string, assignmentId?: string | null) {
  return `${EDITOR_DRAFT_STORAGE_PREFIX}:${questionId}:${assignmentId ?? "practice"}`;
}

export function readEditorDraft(storageKey: string) {
  try {
    const rawDraft = window.localStorage.getItem(storageKey);
    if (!rawDraft) {
      return null;
    }

    const parsed = JSON.parse(rawDraft);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return null;
  }
}

export function writeEditorDraft(storageKey: string, draft: Record<string, string>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Ignore storage failures so editing still works in restricted browsers.
  }
}
