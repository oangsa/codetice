"use client";

import { useMemo } from "react";
import Editor from "@monaco-editor/react";

function resolveMonacoLanguage(language: string) {
  const normalized = language.trim().toLowerCase();

  if (["pyright", "python-lsp", "python-lsp-server", "pylsp"].includes(normalized)) {
    return "python";
  }

  if (["c", "cc", "c++", "cplusplus", "clang", "clangd"].includes(normalized)) {
    return "cpp";
  }

  return normalized || "plaintext";
}

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
    <div className="overflow-hidden rounded-[16px] border border-black/5 dark:border-white/10">
      <Editor
        height={height}
        language={editorLanguage}
        value={sourceCode}
        theme="vs"
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "Agave, 'Agave Nerd Font', 'Cascadia Code', 'Fira Code', ui-monospace, monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          folding: false,
          renderLineHighlight: "none",
          contextmenu: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
