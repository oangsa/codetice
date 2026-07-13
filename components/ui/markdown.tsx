import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const TRANSLATIONS: Record<string, string> = {
  "ตัวอย่าง": "Samples",
  "ตัวอย่างข้อมูลนำเข้า": "Input",
  "ตัวอย่างข้อมูลส่งออก": "Output",
  "ข้อมูลนำเข้า": "Input",
  "ข้อมูลส่งออก": "Output",
  "ผลลัพธ์": "Output",
  "ตัวอย่างผลลัพธ์": "Output",
  "ตัวอย่างผลรัน": "Output",
};

function translateText(value: string) {
  return TRANSLATIONS[value.trim()] ?? value;
}

function renderText(value: string, preserveLineBreaks = false): React.ReactNode {
  const translated = translateText(value.replace(/<br\s*\/?>/gi, "\n"));

  if (!preserveLineBreaks || !translated.includes("\n")) {
    return translated;
  }

  return translated.split("\n").map((part, index) => (
    <React.Fragment key={`${part}-${index}`}>
      {index > 0 ? <br /> : null}
      {part}
    </React.Fragment>
  ));
}

function renderChildren(children: React.ReactNode, preserveLineBreaks = false): React.ReactNode {
  if (typeof children === "string") {
    return renderText(children, preserveLineBreaks);
  }

  if (Array.isArray(children)) {
    return children.map((child) => renderChildren(child, preserveLineBreaks));
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return React.cloneElement(
      children,
      undefined,
      renderChildren(children.props.children, preserveLineBreaks),
    );
  }

  return children;
}

const COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white first:mt-0">
      {renderChildren(children)}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 text-xl font-semibold text-slate-900 dark:text-white first:mt-0">
      {renderChildren(children)}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900 dark:text-white first:mt-0">
      {renderChildren(children)}
    </h3>
  ),
  p: ({ children }) => <p className="mb-1.5 last:mb-0">{renderChildren(children, true)}</p>,
  strong: ({ children }) => <strong className="font-semibold leading-[inherit] text-slate-900 dark:text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-sky-600 underline underline-offset-2 hover:text-sky-800"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-1 ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-1 ml-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => (
    <li className="leading-[1.55] [&>ol]:mb-1 [&>ol]:mt-1 [&>p]:mb-0.5 [&>p:last-child]:mb-0 [&>ul]:mb-1 [&>ul]:mt-1">
      {renderChildren(children)}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-slate-300 pl-4 italic text-slate-500">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-200 dark:border-slate-800" />,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md border border-black/10 dark:border-white/10 bg-accent px-2 py-1.5 text-sm leading-6 text-foreground">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const codeText = String(children);
    const isBlock = Boolean(className) || codeText.includes("\n");

    if (isBlock) {
      return (
        <code className={cn("block font-mono text-foreground", className)}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs text-foreground">
        {children}
      </code>
    );
  },
  // Tables (GitHub Flavored Markdown)
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-black/10 dark:border-white/10">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-black/10 dark:divide-white/10">{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-black/10 dark:border-white/10 last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2 text-left align-top font-semibold text-slate-900 dark:text-white border-r border-black/10 dark:border-white/10 last:border-r-0">
      {renderChildren(children, true)}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-slate-700 dark:text-slate-300 align-top border-r border-black/10 dark:border-white/10 last:border-r-0">
      {renderChildren(children, true)}
    </td>
  ),
};

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm leading-[1.55] text-slate-700 dark:text-slate-300", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
