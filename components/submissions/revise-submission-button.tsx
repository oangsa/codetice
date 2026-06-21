"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createEditorDraftStorageKey, readEditorDraft, writeEditorDraft } from "@/lib/editor-drafts";

export function ReviseSubmissionButton({
  questionId,
  assignmentId,
  questionHref,
  language,
  sourceCode,
}: {
  questionId: string;
  assignmentId?: string | null;
  questionHref: string;
  language: string;
  sourceCode: string;
}) {
  const router = useRouter();

  function handleRevise() {
    const storageKey = createEditorDraftStorageKey(questionId, assignmentId);
    const currentDraft = readEditorDraft(storageKey) ?? {};
    writeEditorDraft(storageKey, {
      ...currentDraft,
      [language]: sourceCode,
    });
    router.push(questionHref);
  }

  return (
    <Button type="button" variant="secondary" onClick={handleRevise}>
      <RotateCcw className="h-4 w-4" />
      Revise
    </Button>
  );
}
