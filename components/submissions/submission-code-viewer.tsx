"use client";

import { useEffect, useMemo, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";

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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const height = useMemo(() => {
    const lineCount = sourceCode.split("\n").length;
    return Math.min(640, Math.max(160, lineCount * 20 + 28));
  }, [sourceCode]);

  useEffect(() => {
    const updateTheme = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  function handleMount(_editor: unknown, monaco: Monaco) {
    monaco.editor.defineTheme("codetice-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0d0e12",
        "editorGutter.background": "#0d0e12",
        "editorLineNumber.foreground": "#6b7280",
        "editor.lineHighlightBackground": "#13151b",
        "editorCursor.foreground": "#ffffff",
      },
    });
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-black/5 bg-white dark:border-white/10 dark:bg-[#0d0e12]">
      <Editor
        height={height}
        language={editorLanguage}
        value={sourceCode}
        theme={theme === "dark" ? "codetice-dark" : "vs"}
        onMount={handleMount}
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
