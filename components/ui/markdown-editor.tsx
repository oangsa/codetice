"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";
import { Textarea } from "@/components/ui/textarea";

export function MarkdownEditor({
  name,
  defaultValue = "",
  required,
  rows = 10,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-0">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              tab === t
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto pr-1 text-[11px] text-slate-400">Markdown</span>
      </div>

      {/* Hidden input that carries the actual value in the form */}
      <input type="hidden" name={name} value={value} required={required} />

      {tab === "write" ? (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={rows}
          placeholder={
            placeholder ??
            "Write your question description in Markdown…\n\n# Heading\n**Bold**, *italic*\n\n| Input | Output |\n|-------|--------|\n| 5 2   | 7      |"
          }
          className="rounded-t-none border-t-0 font-mono text-sm focus-visible:ring-0"
        />
      ) : (
        <div className="min-h-32 rounded-b-md border border-t-0 border-slate-200 bg-white p-4">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-slate-400 italic">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
