"use client";

import { useMemo } from "react";

import { MonacoCodeEditor, resolveMonacoLanguage } from "@/modules/questions/editor/monaco-code-editor";

export function SubmissionCodeViewer({
  sourceCode,
  language,
}: {
  sourceCode: string;
  language: string;
}) {
  const editorLanguage = resolveMonacoLanguage(language);
  const height = useMemo(() => {
    const lineCount = sourceCode.split("\n").length;
    return Math.min(640, Math.max(160, lineCount * 20 + 28));
  }, [sourceCode]);

  return (
    <div className="overflow-hidden rounded-[16px] border border-black/5 bg-white dark:border-white/10 dark:bg-[#0d0e12]">
      <MonacoCodeEditor
        disabled
        height={height}
        language={editorLanguage}
        value={sourceCode}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "Agave, 'Agave Nerd Font', 'Cascadia Code', 'Fira Code', ui-monospace, monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          folding: false,
          renderLineHighlight: "none",
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
