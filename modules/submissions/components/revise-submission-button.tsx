"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createEditorDraftStorageKey, readEditorDraft, writeEditorDraft } from "@/modules/questions/editor-drafts";

export function ReviseSubmissionButton({
  questionId,
  questionHref,
  language,
  sourceCode,
}: {
  questionId: string;
  questionHref: string;
  language: string;
  sourceCode: string;
}) {
  const router = useRouter();

  function handleRevise() {
    const storageKey = createEditorDraftStorageKey(questionId);
    const currentDraft = readEditorDraft(storageKey) ?? {};
    writeEditorDraft(storageKey, {
      ...currentDraft,
      [language]: sourceCode,
    });
    router.push(questionHref);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Revise submission"
      title="Revise submission"
      onClick={handleRevise}
    >
      <RotateCcw className="h-4 w-4" />
      Revise
    </Button>
  );
}
