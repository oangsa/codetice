"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CHECKER_TYPES } from "@/modules/questions/constants";
import { Messages } from "@/lib/api.constants";

type TestcaseRecord = {
  id?: string;
  name?: string | null;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  isHidden: boolean;
  checkerType: string;
  floatTolerance: string | number | null;
  sortOrder: number;
};

const initialState: TestcaseRecord = {
  name: "",
  input: "",
  expectedOutput: "",
  isSample: false,
  isHidden: true,
  checkerType: "exact",
  floatTolerance: null,
  sortOrder: 0,
};

export function TestcaseDialog({
  workspaceId,
  questionId,
  testcase,
  triggerLabel,
  trigger,
}: {
  workspaceId: string;
  questionId: string;
  testcase?: TestcaseRecord;
  triggerLabel: string;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [checkerType, setCheckerType] = useState<string>(testcase?.checkerType ?? "exact");
  const current = testcase ?? initialState;

  async function handleSubmit(formData: FormData) {
    setPending(true);

    const payload = {
      name: String(formData.get("name") ?? ""),
      input: String(formData.get("input") ?? ""),
      expectedOutput: String(formData.get("expectedOutput") ?? ""),
      isSample: formData.get("isSample") === "on",
      isHidden: formData.get("isHidden") === "on",
      checkerType,
      floatTolerance:
        checkerType === "floating_point_tolerance"
          ? Number(formData.get("floatTolerance") ?? 0.000001)
          : null,
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    };

    const endpoint = testcase
      ? `/api/workspaces/${workspaceId}/questions/${questionId}/testcases/${testcase.id}`
      : `/api/workspaces/${workspaceId}/questions/${questionId}/testcases`;
    const method = testcase ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      toast.error(data.message ?? Messages.unableToSaveTestcase);
      setPending(false);
      return;
    }

    toast.success(testcase ? "Testcase updated." : "Testcase created.");
    setOpen(false);
    setPending(false);
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant={testcase ? "outline" : "default"}
            className="h-10 rounded-full px-5 font-semibold"
          >
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{testcase ? "Edit testcase" : "Add testcase"}</DialogTitle>
          <DialogDescription>Visible sample cases can be run by students. Hidden cases stay masked.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          action={async (formData) => {
            await handleSubmit(formData);
          }}
        >
          <FormField label="Name" htmlFor="name">
            <Input id="name" name="name" defaultValue={current.name ?? ""} />
          </FormField>
          <FormField label="Input" htmlFor="input">
            <Textarea id="input" name="input" defaultValue={current.input} />
          </FormField>
          <FormField label="Expected output" htmlFor="expectedOutput">
            <Textarea id="expectedOutput" name="expectedOutput" defaultValue={current.expectedOutput} />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Checker type" htmlFor="checkerType">
              <Select value={checkerType} onValueChange={setCheckerType}>
                <SelectTrigger id="checkerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHECKER_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Sort order" htmlFor="sortOrder">
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={current.sortOrder} />
            </FormField>
          </div>
          {checkerType === "floating_point_tolerance" ? (
            <FormField
              label="Float tolerance"
              htmlFor="floatTolerance"
              description="Absolute tolerance used to compare numeric tokens."
            >
              <Input
                id="floatTolerance"
                name="floatTolerance"
                type="number"
                step="0.000001"
                defaultValue={current.floatTolerance ?? 0.000001}
              />
            </FormField>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Sample</label>
              <div className="flex h-10 items-center rounded-md border border-slate-200 px-3">
                <Switch name="isSample" defaultChecked={current.isSample} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Hidden</label>
              <div className="flex h-10 items-center rounded-md border border-slate-200 px-3">
                <Switch name="isHidden" defaultChecked={current.isHidden} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {testcase ? "Save changes" : "Create testcase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
