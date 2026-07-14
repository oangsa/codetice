"use client";

import { useEffect, useState } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";

export const CODE_EDITOR_DARK_THEME = "codetice-dark";

function getCurrentTheme() {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function resolveMonacoLanguage(language: string) {
  const normalized = language.trim().toLowerCase();

  if (["pyright", "python-lsp", "python-lsp-server", "pylsp"].includes(normalized)) {
    return "python";
  }

  if (["c", "cc", "c++", "cplusplus", "clang", "clangd"].includes(normalized)) {
    return "cpp";
  }

  return normalized || "plaintext";
}

export function defineCodeticeDarkTheme(monaco: Monaco) {
  monaco.editor.defineTheme(CODE_EDITOR_DARK_THEME, {
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

type MonacoCodeEditorProps = {
  disabled?: boolean;
  height: string | number;
  language: string;
  value: string;
  options: React.ComponentProps<typeof Editor>["options"];
  onChange?: React.ComponentProps<typeof Editor>["onChange"];
  onMount?: OnMount;
};

export function MonacoCodeEditor({
  disabled = false,
  height,
  language,
  value,
  options,
  onChange,
  onMount,
}: MonacoCodeEditorProps) {
  const [theme, setTheme] = useState<"light" | "dark">(getCurrentTheme);

  useEffect(() => {
    const updateTheme = () => {
      setTheme(getCurrentTheme());
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

  useEffect(() => {
    void import("monaco-editor").then((monaco) => {
      monaco.editor.setTheme(theme === "dark" ? CODE_EDITOR_DARK_THEME : "vs");
    });
  }, [theme]);

  const handleMount: OnMount = (editor, monaco) => {
    defineCodeticeDarkTheme(monaco);
    monaco.editor.setTheme(
      document.documentElement.classList.contains("dark") ? CODE_EDITOR_DARK_THEME : "vs",
    );
    onMount?.(editor, monaco);
  };

  const resolvedOptions = disabled
    ? {
        ...options,
        readOnly: true,
        domReadOnly: true,
        contextmenu: false,
      }
    : options;

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      beforeMount={defineCodeticeDarkTheme}
      theme={theme === "dark" ? CODE_EDITOR_DARK_THEME : "vs"}
      onChange={disabled ? undefined : onChange}
      onMount={handleMount}
      options={resolvedOptions}
    />
  );
}
