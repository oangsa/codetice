"use client";

import { useState } from "react";
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

export type Language = {
  id: string;
  name: string;
  slug: string;
  dockerImage: string;
  fileExtension: string;
  runCommand: string;
  editorLanguage: string;
  defaultStarterCode: string | null;
  isEnabled: boolean;
};

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

  async function handleSubmit(formData: FormData) {
    setPending(true);

    const payload: Record<string, unknown> = {
      name: String(formData.get("name") ?? ""),
      dockerImage: String(formData.get("dockerImage") ?? ""),
      fileExtension: String(formData.get("fileExtension") ?? ""),
      runCommand: String(formData.get("runCommand") ?? ""),
      editorLanguage: String(formData.get("editorLanguage") ?? "") || "plaintext",
      defaultStarterCode: String(formData.get("defaultStarterCode") ?? "") || null,
      isEnabled: formData.get("isEnabled") === "on",
    };

    if (!language) {
      // Create — include slug
      payload.slug = String(formData.get("slug") ?? "");
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
      toast.error(data.message ?? "Unable to save language.");
      setPending(false);
      return;
    }

    toast.success(language ? "Language updated and runtime is ready." : "Language created and runtime is ready.");
    setOpen(false);
    setPending(false);
    onSaved();
  }

  const isEdit = !!language;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Name" htmlFor="name">
              <Input
                id="name"
                name="name"
                placeholder="e.g. Python 3"
                defaultValue={language?.name ?? ""}
                required
              />
            </FormField>

            {isEdit ? (
              <FormField label="Slug" htmlFor="slug-readonly">
                <Input
                  id="slug-readonly"
                  value={language.slug}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </FormField>
            ) : (
              <FormField
                label="Slug"
                htmlFor="slug"
                description="Lowercase, letters/numbers/hyphens only. Cannot be changed."
              >
                <Input
                  id="slug"
                  name="slug"
                  placeholder="e.g. python3"
                  pattern="^[a-z][a-z0-9_-]*$"
                  required
                />
              </FormField>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="File extension" htmlFor="fileExtension">
              <Input
                id="fileExtension"
                name="fileExtension"
                placeholder="e.g. py"
                defaultValue={language?.fileExtension ?? ""}
                required
              />
            </FormField>
            <FormField label="Docker image" htmlFor="dockerImage">
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
            description="Monaco syntax id only; Python is the only current LSP/diagnostics language. Use cpp for C and C++."
          >
            <Input
              id="editorLanguage"
              name="editorLanguage"
              placeholder="e.g. python, javascript, cpp, plaintext"
              defaultValue={language?.editorLanguage ?? "plaintext"}
              required
            />
          </FormField>

          <FormField
            label="Run command"
            htmlFor="runCommand"
            description="Command executed inside the container. Use {file} as the script placeholder."
          >
            <Input
              id="runCommand"
              name="runCommand"
              placeholder="e.g. python {file}"
              defaultValue={language?.runCommand ?? ""}
              required
            />
          </FormField>

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
        runCommand: language.runCommand,
        editorLanguage: language.editorLanguage,
        defaultStarterCode: language.defaultStarterCode,
        isEnabled: !language.isEnabled,
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      toast.error(data.message ?? "Unable to update language.");
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
      toast.error(data.message ?? "Unable to delete language.");
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
              <p className="font-medium text-muted-foreground">Run command</p>
              <code className="text-foreground">{language.runCommand}</code>
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
