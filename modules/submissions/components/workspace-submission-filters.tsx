"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/common/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SubmissionFilters = {
  questionId: string;
  studentId: string;
};

const emptyFilters: SubmissionFilters = { questionId: "", studentId: "" };

export function WorkspaceSubmissionFilters({
  questions,
  students,
}: {
  questions: Array<{ id: string; title: string }>;
  students: Array<{ id: string; username: string }>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [filterDraft, setFilterDraft] = useState<SubmissionFilters>(emptyFilters);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const filterValues = {
    questionId: params.get("questionId") ?? "",
    studentId: params.get("studentId") ?? "",
  };
  const activeFilterCount = Number(Boolean(filterValues.questionId)) + Number(Boolean(filterValues.studentId));

  function navigateWithFilters(nextFilters: SubmissionFilters) {
    const next = new URLSearchParams(params.toString());
    if (nextFilters.questionId) next.set("questionId", nextFilters.questionId);
    else next.delete("questionId");
    if (nextFilters.studentId) next.set("studentId", nextFilters.studentId);
    else next.delete("studentId");
    next.delete("pageNumber");
    const query = next.toString();
    router.push(query ? `?${query}` : "?");
  }

  function openFilters() {
    setFilterDraft(filterValues);
    setIsFilterDialogOpen(true);
  }

  function resetFilters() {
    setFilterDraft(emptyFilters);
    setIsFilterDialogOpen(false);
    navigateWithFilters(emptyFilters);
  }

  function applyFilters() {
    setIsFilterDialogOpen(false);
    navigateWithFilters(filterDraft);
  }

  return (
    <>
      <Button
        type="button"
        variant={activeFilterCount > 0 ? "default" : "outline"}
        size="sm"
        tooltip="Filter submissions"
        onClick={openFilters}
        className="h-9 rounded-full"
      >
        <Filter className="h-4 w-4" />
        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
      </Button>

      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="rounded-[30px] p-4 sm:max-w-md sm:rounded-[30px]">
          <DialogHeader className="pl-2">
            <DialogTitle className="text-sm font-semibold text-[var(--text-main)]">Filter submissions</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="submission-filter-question" className="pl-2 text-slate-700">Question</Label>
              <Select
                value={filterDraft.questionId || "all"}
                onValueChange={(value) => setFilterDraft((current) => ({ ...current, questionId: value === "all" ? "" : value }))}
              >
                <SelectTrigger id="submission-filter-question" className="h-9 w-full rounded-full border border-input bg-background font-semibold">
                  <SelectValue placeholder="All questions" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-none">
                  <SelectItem value="all">All questions</SelectItem>
                  {questions.map((question) => <SelectItem key={question.id} value={question.id}>{question.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="submission-filter-student" className="pl-2 text-slate-700">Student</Label>
              <Select
                value={filterDraft.studentId || "all"}
                onValueChange={(value) => setFilterDraft((current) => ({ ...current, studentId: value === "all" ? "" : value }))}
              >
                <SelectTrigger id="submission-filter-student" className="h-9 w-full rounded-full border border-input bg-background font-semibold">
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-none">
                  <SelectItem value="all">All students</SelectItem>
                  {students.map((student) => <SelectItem key={student.id} value={student.id}>{student.username}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-row items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800/60">
            <Button
              type="button"
              variant="ghost"
              onClick={resetFilters}
              className="h-9 rounded-full font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
            >
              Reset
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFilterDialogOpen(false)}
                className="h-9 rounded-full border border-slate-200 bg-white px-4 font-semibold text-slate-900 dark:border-slate-800 dark:bg-[#1c1c1e]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={applyFilters}
                className="h-9 rounded-full bg-black px-4 font-semibold !text-white transition-colors hover:bg-zinc-900/90 dark:bg-black dark:hover:bg-zinc-900/90"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
