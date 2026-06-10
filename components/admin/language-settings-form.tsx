"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORTED_LANGUAGE_SLUGS } from "@/lib/constants";

export function LanguageSettingsForm({
  languages,
}: {
  languages: Array<{
    id: string;
    name: string;
    slug: string;
    dockerImage: string;
    fileExtension: string;
    runCommand: string;
    defaultStarterCode: string | null;
    isEnabled: boolean;
  }>;
}) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const slug = String(formData.get("slug") ?? "");
    setPendingSlug(slug);
    const response = await fetch("/api/languages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        slug,
        dockerImage: String(formData.get("dockerImage") ?? ""),
        fileExtension: String(formData.get("fileExtension") ?? ""),
        runCommand: String(formData.get("runCommand") ?? ""),
        defaultStarterCode: String(formData.get("defaultStarterCode") ?? ""),
        isEnabled: formData.get("isEnabled") === "on",
      }),
    });

    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      toast.error(payload.message ?? "Unable to save language.");
      setPendingSlug(null);
      return;
    }

    toast.success("Language updated.");
    router.refresh();
    setPendingSlug(null);
  }

  return (
    <div className="grid gap-4">
      {SUPPORTED_LANGUAGE_SLUGS.map((slug) => {
        const language = languages.find((item) => item.slug === slug);
        if (!language) {
          return null;
        }

        return (
          <form
            key={slug}
            className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4"
            action={async (formData) => {
              await handleSubmit(formData);
            }}
          >
            <input type="hidden" name="slug" value={language.slug} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Name" htmlFor={`name-${slug}`}>
                <Input id={`name-${slug}`} name="name" defaultValue={language.name} />
              </FormField>
              <FormField label="Extension" htmlFor={`ext-${slug}`}>
                <Input id={`ext-${slug}`} name="fileExtension" defaultValue={language.fileExtension} />
              </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Docker image" htmlFor={`image-${slug}`}>
                <Input id={`image-${slug}`} name="dockerImage" defaultValue={language.dockerImage} />
              </FormField>
              <FormField label="Run command" htmlFor={`run-${slug}`}>
                <Input id={`run-${slug}`} name="runCommand" defaultValue={language.runCommand} />
              </FormField>
            </div>
            <FormField label="Default starter code" htmlFor={`starter-${slug}`}>
              <Textarea id={`starter-${slug}`} name="defaultStarterCode" defaultValue={language.defaultStarterCode ?? ""} />
            </FormField>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Enabled</span>
              <Switch name="isEnabled" defaultChecked={language.isEnabled} />
            </div>
            <Button type="submit" disabled={pendingSlug === slug}>
              Save {language.name}
            </Button>
          </form>
        );
      })}
    </div>
  );
}
