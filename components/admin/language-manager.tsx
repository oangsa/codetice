"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Container,
  FileCode,
  Terminal,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Messages } from "@/lib/api.constants";

export type Language = {
  id: string;
  name: string;
  slug: string;
  dockerImage: string;
  fileExtension: string;
  buildCommand: string | null;
  runCommand: string;
  editorLanguage: string;
  diagnosticsFormat: "none" | "pyright" | "compiler";
  diagnosticsCommand: string | null;
  defaultStarterCode: string | null;
  isEnabled: boolean;
};

function getCompatibleMonacoLanguage(value: string) {
  const normalized = value.trim().toLowerCase();

  if (["pyright", "python-lsp", "python-lsp-server", "pylsp"].includes(normalized)) {
    return "python";
  }

  if (["c", "cc", "c++", "cplusplus", "clang", "clangd"].includes(normalized)) {
    return "cpp";
  }

  return normalized;
}

// ─── Create / Edit dialog ────────────────────────────────────────────────────

function LanguageDialog({
  language,
  trigger,
  onSaved,
}: {
  language?: Language;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [monacoLanguageIds, setMonacoLanguageIds] = useState<string[]>([]);
  const [diagnosticsFormat, setDiagnosticsFormat] = useState<"none" | "pyright" | "compiler">(
    language?.diagnosticsFormat ?? "none",
  );
  const monacoLanguageListId = useId();

  const monacoLanguageIdSet = useMemo(
    () => new Set(monacoLanguageIds),
    [monacoLanguageIds],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    void import("monaco-editor").then((monaco) => {
      if (cancelled) {
        return;
      }

      setMonacoLanguageIds(
        monaco.languages
          .getLanguages()
          .map((item) => item.id)
          .sort((a, b) => a.localeCompare(b)),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit(formData: FormData) {
    setPending(true);

    const payload: Record<string, unknown> = {
      name: String(formData.get("name") ?? ""),
      dockerImage: String(formData.get("dockerImage") ?? ""),
      fileExtension: String(formData.get("fileExtension") ?? ""),
      buildCommand: String(formData.get("buildCommand") ?? "") || null,
      runCommand: String(formData.get("runCommand") ?? ""),
      editorLanguage: getCompatibleMonacoLanguage(String(formData.get("editorLanguage") ?? "") || "plaintext"),
      diagnosticsFormat: String(formData.get("diagnosticsFormat") ?? "none"),
      diagnosticsCommand: String(formData.get("diagnosticsCommand") ?? "") || null,
      defaultStarterCode: String(formData.get("defaultStarterCode") ?? "") || null,
      isEnabled: formData.get("isEnabled") === "on",
    };

    const editorLanguage = String(payload.editorLanguage);
    if (monacoLanguageIds.length > 0 && !monacoLanguageIdSet.has(editorLanguage)) {
      toast.error(`Unknown Monaco language id "${editorLanguage}".`);
      setPending(false);
      return;
    }

    const endpoint = language ? `/api/languages/${language.id}` : "/api/languages";
    const method = language ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { message?: string };

    if (!response.ok) {
      toast.error(data.message ?? Messages.unableToCreateLanguage);
      setPending(false);
      return;
    }

    toast.success(language ? "Language updated and runtime is ready." : "Language created and runtime is ready.");
    setOpen(false);
    setPending(false);
    onSaved();
  }

  const isEdit = !!language;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setDiagnosticsFormat(language?.diagnosticsFormat ?? "none");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit language" : "Add language"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the runtime configuration for this language. New or re-enabled Docker images are prepared before saving."
              : "Define a new language runtime. The Docker image is prepared before the language is saved."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          action={async (formData) => {
            await handleSubmit(formData);
          }}
        >
          <FormField label="Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Python 3"
              defaultValue={language?.name ?? ""}
              required
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="File extension" htmlFor="fileExtension" required>
              <Input
                id="fileExtension"
                name="fileExtension"
                placeholder="e.g. py"
                defaultValue={language?.fileExtension ?? ""}
                required
              />
            </FormField>
            <FormField label="Docker image" htmlFor="dockerImage" required>
              <Input
                id="dockerImage"
                name="dockerImage"
                placeholder="e.g. python:3.12-alpine"
                defaultValue={language?.dockerImage ?? ""}
                required
              />
            </FormField>
          </div>

          <FormField
            label="Editor language"
            htmlFor="editorLanguage"
            description="Stored as a real Monaco language id. Diagnostics can come from Pyright or compiler output."
          >
            <Input
              id="editorLanguage"
              name="editorLanguage"
              list={monacoLanguageListId}
              placeholder="e.g. python, cpp, javascript, plaintext"
              defaultValue={getCompatibleMonacoLanguage(language?.editorLanguage ?? "plaintext")}
              required
            />
            <datalist id={monacoLanguageListId}>
              {monacoLanguageIds.map((languageId) => (
                <option key={languageId} value={languageId} />
              ))}
            </datalist>
          </FormField>

          <FormField
            label="Build command"
            htmlFor="buildCommand"
            description="Optional. Runs once before testcases. Use {file} and write build artifacts to /tmp."
          >
            <Input
              id="buildCommand"
              name="buildCommand"
              placeholder="e.g. rustc {file} -o /tmp/main"
              defaultValue={language?.buildCommand ?? ""}
            />
          </FormField>

          <FormField
            label="Run command"
            htmlFor="runCommand"
            description="Command executed for each testcase. Use {file} as the source placeholder or run a /tmp build artifact."
          >
            <Input
              id="runCommand"
              name="runCommand"
              placeholder="e.g. python {file}"
              defaultValue={language?.runCommand ?? ""}
              required
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Diagnostics format"
              htmlFor="diagnosticsFormat"
              description="Choose how editor diagnostics are produced for this language."
            >
              <input type="hidden" name="diagnosticsFormat" value={diagnosticsFormat} />
              <Select value={diagnosticsFormat} onValueChange={(value) => setDiagnosticsFormat(value as "none" | "pyright" | "compiler")}>
                <SelectTrigger id="diagnosticsFormat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pyright">Pyright</SelectItem>
                  <SelectItem value="compiler">Compiler</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Diagnostics command"
              htmlFor="diagnosticsCommand"
              description="Optional for Pyright, required for compiler diagnostics. Use {file} as the placeholder."
            >
              <Input
                id="diagnosticsCommand"
                name="diagnosticsCommand"
                placeholder={
                  diagnosticsFormat === "compiler"
                    ? "e.g. gcc -fsyntax-only -x c {file}"
                    : diagnosticsFormat === "pyright"
                      ? "Usually not needed for Pyright"
                      : "Optional"
                }
                defaultValue={language?.diagnosticsCommand ?? ""}
                required={diagnosticsFormat === "compiler"}
              />
            </FormField>
          </div>

          <FormField label="Default starter code" htmlFor="defaultStarterCode">
            <Textarea
              id="defaultStarterCode"
              name="defaultStarterCode"
              rows={4}
              placeholder="# Write your solution here"
              defaultValue={language?.defaultStarterCode ?? ""}
            />
          </FormField>

          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Enabled</p>
              <p className="text-xs text-muted-foreground">
                Disabled languages are hidden from students.
              </p>
            </div>
            <Switch name="isEnabled" defaultChecked={language?.isEnabled ?? true} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Preparing runtime..." : isEdit ? "Save changes" : "Create language"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Single language row card ─────────────────────────────────────────────────

function LanguageCard({
  language,
  onSaved,
  onDeleted,
}: {
  language: Language;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);

  async function handleToggleEnabled() {
    setTogglingEnabled(true);
    const response = await fetch(`/api/languages/${language.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: language.name,
        dockerImage: language.dockerImage,
        fileExtension: language.fileExtension,
        buildCommand: language.buildCommand,
        runCommand: language.runCommand,
        editorLanguage: language.editorLanguage,
        diagnosticsFormat: language.diagnosticsFormat,
        diagnosticsCommand: language.diagnosticsCommand,
        defaultStarterCode: language.defaultStarterCode,
        isEnabled: !language.isEnabled,
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      toast.error(data.message ?? Messages.unableToUpdateLanguage);
    } else {
      toast.success(language.isEnabled ? "Language disabled." : "Language enabled.");
      onSaved();
    }
    setTogglingEnabled(false);
  }

  async function handleDelete() {
    const response = await fetch(`/api/languages/${language.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      toast.error(data.message ?? Messages.unableToDeleteLanguage);
      return;
    }

    toast.success("Language deleted.");
    onDeleted();
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileCode className="h-5 w-5" />
        </div>

        {/* Name + slug */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{language.name}</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              .{language.fileExtension}
            </code>
            <Badge
              variant={language.isEnabled ? "default" : "secondary"}
              className="text-xs"
            >
              {language.isEnabled ? "enabled" : "disabled"}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            slug: <code>{language.slug}</code>
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Quick enable/disable toggle */}
          <Button
            variant="ghost"
            size="icon"
            title={language.isEnabled ? "Disable" : "Enable"}
            disabled={togglingEnabled}
            onClick={() => void handleToggleEnabled()}
          >
            {language.isEnabled ? (
              <ToggleRight className="h-5 w-5 text-green-600" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>

          {/* Edit */}
          <LanguageDialog
            language={language}
            trigger={
              <Button variant="ghost" size="icon" title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
            }
            onSaved={onSaved}
          />

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete language?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove <strong>{language.name}</strong> from the platform.
                  Existing submissions that used this language will not be affected, but students
                  will no longer be able to choose it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => void handleDelete()}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Expand / collapse detail */}
          <Button
            variant="ghost"
            size="icon"
            title={expanded ? "Collapse" : "Expand"}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t bg-muted/30 px-5 py-4 grid gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Container className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground">Docker image</p>
              <code className="text-foreground">{language.dockerImage}</code>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground">Build command</p>
              <code className="text-foreground">{language.buildCommand ?? "None"}</code>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground">Run command</p>
              <code className="text-foreground">{language.runCommand}</code>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground">Diagnostics</p>
              <code className="text-foreground">{language.diagnosticsFormat}</code>
              {language.diagnosticsCommand ? <p className="mt-1"><code className="text-foreground">{language.diagnosticsCommand}</code></p> : null}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileCode className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground">Editor language</p>
              <code className="text-foreground">{language.editorLanguage}</code>
            </div>
          </div>
          {language.defaultStarterCode && (
            <div className="flex items-start gap-2">
              <FileCode className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-muted-foreground">Default starter code</p>
                <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-xs text-foreground">
                  {language.defaultStarterCode}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main manager component ───────────────────────────────────────────────────

export function LanguageManager({
  languages: initialLanguages,
}: {
  languages: Language[];
}) {
  const router = useRouter();
  const [languages, setLanguages] = useState<Language[]>(initialLanguages);

  function refresh() {
    router.refresh();
    // Optimistically keep UI stable; Next.js will push fresh data
  }

  async function refreshLanguages() {
    const res = await fetch("/api/admin/languages");
    if (res.ok) {
      const data = (await res.json()) as { languages: Language[] };
      setLanguages(data.languages);
    } else {
      refresh();
    }
  }

  const enabled = languages.filter((l) => l.isEnabled);
  const disabled = languages.filter((l) => !l.isEnabled);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{enabled.length}</strong> enabled
          </span>
          <span>·</span>
          <span>
            <strong className="text-foreground">{disabled.length}</strong> disabled
          </span>
          <span>·</span>
          <span>
            <strong className="text-foreground">{languages.length}</strong> total
          </span>
        </div>

        <LanguageDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add language
            </Button>
          }
          onSaved={() => void refreshLanguages()}
        />
      </div>

      {/* Language cards */}
      {languages.length === 0 ? (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 py-16 text-center text-muted-foreground">
          <FileCode className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">No languages configured yet.</p>
          <p className="mt-1 text-xs">Add the first language to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {languages.map((lang) => (
            <LanguageCard
              key={lang.id}
              language={lang}
              onSaved={() => void refreshLanguages()}
              onDeleted={() => setLanguages((prev) => prev.filter((l) => l.id !== lang.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
