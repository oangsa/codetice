"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Edit, Filter, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  DataTable,
  DataTablePagination,
  DataTableSearch,
  type DataTableColumn,
} from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn, formatScore } from "@/lib/utils";

export type WorkspaceQuestionRow = {
  questionId: string;
  title: string;
  slug: string;
  difficulty: string;
  totalScore: string;
  bestScore: string | null;
  attempts: number;
  status: "todo" | "attempted" | "accepted";
  isPublished: boolean;
};

const difficultyVariants: Record<string, string> = {
  easy: "bg-green-50 text-green-900",
  medium: "bg-amber-50 text-amber-900",
  normal: "bg-amber-50 text-amber-900",
  hard: "bg-red-50 text-red-900",
};

const statusVariants: Record<
  WorkspaceQuestionRow["status"],
  { label: string; dotClassName: string; textClassName: string }
> = {
  todo: { label: "Todo", dotClassName: "bg-amber-400", textClassName: "text-slate-900" },
  attempted: { label: "Failed", dotClassName: "bg-red-500", textClassName: "text-slate-900" },
  accepted: { label: "Passed", dotClassName: "bg-green-500", textClassName: "text-slate-900" },
};

const filterFields = [
  {
    key: "difficulty",
    label: "Level",
    options: [
      { label: "Easy", value: "easy" },
      { label: "Medium", value: "medium" },
      { label: "Hard", value: "hard" },
    ],
  },
  {
    key: "status",
    label: "Status",
    options: [
      { label: "To Do", value: "todo" },
      { label: "Attempted", value: "attempted" },
      { label: "Accepted", value: "accepted" },
    ],
  },
] as const;

const emptyFilters = { difficulty: "", status: "" };
const pageSize = 10;

export function QuestionTable({
  questions,
  workspaceId,
  canManage = false,
}: {
  questions: WorkspaceQuestionRow[];
  workspaceId: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(emptyFilters);
  const [filterDraft, setFilterDraft] = useState<Record<string, string>>(emptyFilters);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const editMode = canManage && searchParams.get("editMode") === "1";

  const visibleQuestions = useMemo(
    () => (editMode ? questions : questions.filter((question) => question.isPublished)),
    [editMode, questions],
  );
  const activeFilters = useMemo(() => filterFields
    .filter((field) => Boolean(filterValues[field.key]))
    .map((field) => {
      const rawValue = filterValues[field.key];
      return {
        field,
        displayValue: field.options.find((option) => option.value === rawValue)?.label ?? rawValue,
      };
    }), [filterValues]);
  const filtered = useMemo(() => visibleQuestions.filter((question) => {
    const matchesSearch = !search || question.title.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = !filterValues.difficulty
      || question.difficulty.toLowerCase() === filterValues.difficulty.toLowerCase();
    const matchesStatus = !filterValues.status || question.status === filterValues.status;
    return matchesSearch && matchesLevel && matchesStatus;
  }), [filterValues, search, visibleQuestions]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function setEditMode(checked: boolean) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (checked) nextParams.set("editMode", "1");
    else nextParams.delete("editMode");
    const query = nextParams.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  function resetFilters() {
    setFilterDraft(emptyFilters);
    setFilterValues(emptyFilters);
    setPage(1);
    setIsFilterDialogOpen(false);
  }

  async function deleteQuestion(questionId: string) {
    if (!confirm("Are you sure you want to delete this question? This action cannot be undone.")) return;
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/questions/${questionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete question.");
      toast.success("Question deleted successfully.");
      router.refresh();
    } catch {
      toast.error("Unable to delete question.");
    }
  }

  const columns: DataTableColumn<WorkspaceQuestionRow>[] = [
    {
      id: "number",
      header: "No.",
      headerClassName: "w-12",
      cellClassName: "tabular-nums text-slate-400",
      cell: (_question, index) => (currentPage - 1) * pageSize + index + 1,
    },
    {
      id: "name",
      header: "Name",
      cell: (question) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{question.title}</span>
          {!question.isPublished ? <Badge variant="default" className="bg-slate-100 py-0 text-[10px] text-slate-500">Hidden</Badge> : null}
        </div>
      ),
    },
    {
      id: "level",
      header: "Level",
      headerClassName: "w-24",
      cell: (question) => (
        <span className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
          difficultyVariants[question.difficulty] ?? "bg-slate-100 text-slate-900",
        )}>
          {question.difficulty}
        </span>
      ),
    },
    {
      id: "submissions",
      header: "Submission",
      headerClassName: "w-24 text-right",
      cellClassName: "text-right tabular-nums text-slate-600",
      cell: (question) => question.attempts > 0 ? question.attempts : "-",
    },
    {
      id: "score",
      header: "Score",
      headerClassName: "w-24 text-right",
      cellClassName: "text-right tabular-nums font-medium text-slate-900",
      cell: (question) => question.bestScore ? formatScore(question.bestScore) : "None",
    },
    {
      id: "status",
      header: "Status",
      headerClassName: "w-24 text-right",
      cellClassName: "text-right",
      cell: (question) => (
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className={cn("h-1.5 w-1.5 rounded-full", statusVariants[question.status].dotClassName)} />
          <span className={statusVariants[question.status].textClassName}>{statusVariants[question.status].label}</span>
        </span>
      ),
    },
    ...(editMode ? [{
      id: "actions",
      header: "Action",
      headerClassName: "w-24 text-right",
      cellClassName: "text-right",
      cell: (question: WorkspaceQuestionRow) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/workspaces/${workspaceId}/questions/${question.questionId}/edit`}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Edit question"
            onClick={(event) => event.stopPropagation()}
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void deleteQuestion(question.questionId);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
            title="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    } satisfies DataTableColumn<WorkspaceQuestionRow>] : []),
  ];

  return (
    <>
      <DataTable
        title="Questions"
        rows={pageItems}
        columns={columns}
        getRowKey={(question) => question.questionId}
        onRowClick={(question) => router.push(`/workspaces/${workspaceId}/questions/${question.slug}`)}
        emptyMessage={search ? "No questions match your search." : "No questions in this workspace yet."}
        search={
          <DataTableSearch
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search by name"
            endAdornment={
              <Button
                type="button"
                variant={activeFilters.length > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFilterDraft(filterValues);
                  setIsFilterDialogOpen(true);
                }}
                className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-xl px-2.5"
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
            }
          />
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="h-9 rounded-full">
              <Link href={`/workspaces/${workspaceId}/submissions`}>Submissions</Link>
            </Button>
            {canManage ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">Edit Mode</span>
                  <Switch checked={editMode} onCheckedChange={setEditMode} />
                </div>
                <Button asChild size="sm" className="h-9 w-[150px] rounded-full !text-primary-foreground hover:!text-primary-foreground">
                  <Link href={`/workspaces/${workspaceId}/questions/new`}><Plus className="h-4 w-4" />Add question</Link>
                </Button>
              </>
            ) : null}
          </>
        }
        filters={activeFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            <span className="pl-1 text-xs font-medium uppercase tracking-[0.05em] text-slate-400">Filters:</span>
            {activeFilters.map(({ displayValue, field }) => (
              <Button
                key={field.key}
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 rounded-full border-slate-200 px-3 text-xs text-slate-700 hover:bg-background hover:text-slate-700"
                onClick={() => {
                  setFilterValues((current) => ({ ...current, [field.key]: "" }));
                  setPage(1);
                }}
              >
                <span>{field.label}: {displayValue}</span><X className="h-3 w-3 text-slate-400" />
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500 hover:text-slate-950" onClick={resetFilters}>Clear all</Button>
          </div>
        ) : null}
        pagination={totalPages > 1 ? (
          <DataTablePagination
            label={`Page ${currentPage} of ${totalPages}`}
            previous={{ label: "Prev", disabled: currentPage === 1, onClick: () => setPage(Math.max(1, currentPage - 1)) }}
            next={{ label: "Next", disabled: currentPage === totalPages, onClick: () => setPage(Math.min(totalPages, currentPage + 1)) }}
          />
        ) : null}
      />

      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="rounded-[30px] p-4 sm:max-w-md sm:rounded-[30px]">
          <DialogHeader className="pl-2"><DialogTitle className="text-sm font-semibold text-[var(--text-main)]">Filter Questions</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            {filterFields.map((field) => (
              <div className="grid gap-2" key={field.key}>
                <Label htmlFor={`filter-${field.key}`} className="pl-2 text-slate-700">{field.label}</Label>
                <Select
                  value={filterDraft[field.key] || "all"}
                  onValueChange={(value) => setFilterDraft((current) => ({ ...current, [field.key]: value === "all" ? "" : value }))}
                >
                  <SelectTrigger id={`filter-${field.key}`} className="h-9 w-full rounded-full border border-input bg-background font-semibold"><SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">{field.label === "Status" ? "All Statuses" : `All ${field.label}s`}</SelectItem>
                    {field.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex flex-row items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800/60">
            <Button variant="ghost" onClick={resetFilters} className="h-9 rounded-full font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20">Reset</Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFilterDialogOpen(false)} className="h-9 rounded-full border border-slate-200 bg-white px-4 font-semibold text-slate-900 dark:border-slate-800 dark:bg-[#1c1c1e]">Cancel</Button>
              <Button type="button" onClick={() => {
                setFilterValues(filterDraft);
                setPage(1);
                setIsFilterDialogOpen(false);
              }} className="h-9 rounded-full bg-black px-4 font-semibold !text-white transition-colors hover:bg-zinc-900/90 dark:bg-black dark:hover:bg-zinc-900/90">Apply Filters</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
