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
import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QuestionCloneDialog } from "@/modules/questions/components/question-clone-dialog";
import type { WorkspaceTag } from "@/lib/tags";
import { useCollectionSearch } from "@/lib/use-collection-search";
import type { PagedResult } from "@/lib/pagination";
import { cn, formatScore } from "@/lib/utils";

export type WorkspaceQuestionRow = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  totalScore: string;
  bestScore: string | null;
  attempts: number;
  status: "todo" | "attempted" | "accepted";
  isPublished: boolean;
  tags: WorkspaceTag[];
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

type QuestionFilters = { difficulty: string; status: string; tagIds: string[] };

const emptyFilters: QuestionFilters = { difficulty: "", status: "", tagIds: [] };
const publishedQuestionRequest = {
  search: [{ name: "isPublished", condition: "EQUAL", value: true }],
};

export function QuestionTable({
  initialPage,
  workspaceId,
  canManage = false,
  tags,
  cloneTargets,
}: {
  initialPage: PagedResult<WorkspaceQuestionRow>;
  workspaceId: string;
  canManage?: boolean;
  tags: WorkspaceTag[];
  cloneTargets: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<QuestionFilters>(emptyFilters);
  const [filterDraft, setFilterDraft] = useState<QuestionFilters>(emptyFilters);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [publicationAction, setPublicationAction] = useState<"publish" | "unpublish" | null>(null);
  const [isUpdatingPublication, setIsUpdatingPublication] = useState(false);
  const editMode = canManage && searchParams.get("editMode") === "1";
  const activeFilters = useMemo(() => [
    ...filterFields
      .filter((field) => Boolean(filterValues[field.key]))
      .map((field) => ({
        key: field.key,
        label: field.label,
        displayValue: field.options.find((option) => option.value === filterValues[field.key])?.label ?? filterValues[field.key],
      })),
    ...(filterValues.tagIds.length > 0 ? [{
      key: "tagIds",
      label: "Tags",
      displayValue: tags.filter((tag) => filterValues.tagIds.includes(tag.id)).map((tag) => tag.name).join(", "),
    }] : []),
  ], [filterValues, tags]);
  const request = useMemo(() => ({
    search: [
      ...(filterValues.difficulty ? [{ name: "difficulty", condition: "EQUAL", value: filterValues.difficulty }] : []),
      ...(filterValues.status ? [{ name: "status", condition: "EQUAL", value: filterValues.status }] : []),
      ...(!editMode ? [{ name: "isPublished", condition: "EQUAL", value: true }] : []),
    ],
    ...(filterValues.tagIds.length > 0 ? { tagIds: filterValues.tagIds } : {}),
    ...(search.trim() ? { searchTerm: { name: "title,slug", value: search } } : {}),
  }), [editMode, filterValues, search]);
  const collection = useCollectionSearch<WorkspaceQuestionRow>({
    endpoint: `/api/workspaces/${workspaceId}/questions/search`,
    initialPage,
    initialRequest: publishedQuestionRequest,
    request,
  });
  const pageItems = collection.page.items;
  const selectedPageQuestionIds = pageItems.filter((question) => selectedQuestionIds.has(question.id)).map((question) => question.id);
  const allPageQuestionsSelected = pageItems.length > 0 && selectedPageQuestionIds.length === pageItems.length;

  function setEditMode(checked: boolean) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (checked) nextParams.set("editMode", "1");
    else nextParams.delete("editMode");
    const query = nextParams.toString();
    setSelectedQuestionIds(new Set());
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  function resetFilters() {
    setFilterDraft({ ...emptyFilters, tagIds: [] });
    setFilterValues({ ...emptyFilters, tagIds: [] });
    setSelectedQuestionIds(new Set());
    setIsFilterDialogOpen(false);
  }

  function toggleQuestionSelection(questionId: string, checked: boolean) {
    setSelectedQuestionIds((current) => {
      const next = new Set(current);
      if (checked) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
  }

  function togglePageSelection(checked: boolean) {
    setSelectedQuestionIds((current) => {
      const next = new Set(current);
      for (const question of pageItems) {
        if (checked) next.add(question.id);
        else next.delete(question.id);
      }
      return next;
    });
  }

  async function updatePublication() {
    if (!publicationAction || selectedQuestionIds.size === 0) return;
    setIsUpdatingPublication(true);
    const isPublished = publicationAction === "publish";
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/questions/publication`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [...selectedQuestionIds], isPublished }),
      });
      const data = await response.json() as {
        message?: string;
        updatedQuestionIds?: string[];
        skippedQuestionIds?: string[];
      };
      if (!response.ok) throw new Error(data.message ?? "Unable to update publication.");
      const updatedCount = data.updatedQuestionIds?.length ?? 0;
      const skippedCount = data.skippedQuestionIds?.length ?? 0;
      toast.success(isPublished
        ? `Published ${updatedCount} question${updatedCount === 1 ? "" : "s"}.${skippedCount ? ` Skipped ${skippedCount} without test cases.` : ""}`
        : `Unpublished ${updatedCount} question${updatedCount === 1 ? "" : "s"}.`);
      setSelectedQuestionIds(new Set());
      setPublicationAction(null);
      collection.reload();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update publication.");
    } finally {
      setIsUpdatingPublication(false);
    }
  }

  async function deleteQuestion(questionId: string) {
    if (!confirm("Are you sure you want to delete this question? This action cannot be undone.")) return;
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/questions/${questionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete question.");
      toast.success("Question deleted successfully.");
      setSelectedQuestionIds((current) => {
        const next = new Set(current);
        next.delete(questionId);
        return next;
      });
      collection.reload();
      router.refresh();
    } catch {
      toast.error("Unable to delete question.");
    }
  }

  const columns: DataTableColumn<WorkspaceQuestionRow>[] = [
    ...(editMode ? [{
      id: "select",
      header: (
        <Checkbox
          aria-label="Select loaded questions"
          checked={allPageQuestionsSelected ? true : selectedPageQuestionIds.length > 0 ? "indeterminate" : false}
          onCheckedChange={(checked) => togglePageSelection(checked === true)}
        />
      ),
      headerClassName: "w-10 px-3",
      cellClassName: "w-10 px-3",
      cell: (question: WorkspaceQuestionRow) => (
        <Checkbox
          aria-label={`Select ${question.title}`}
          checked={selectedQuestionIds.has(question.id)}
          onClick={(event) => event.stopPropagation()}
          onCheckedChange={(checked) => toggleQuestionSelection(question.id, checked === true)}
        />
      ),
    } satisfies DataTableColumn<WorkspaceQuestionRow>] : []),
    {
      id: "number",
      header: "No.",
      headerClassName: "w-12",
      cellClassName: "tabular-nums text-slate-400",
      cell: (_question, index) => ((collection.page.meta.currentPage - 1) * collection.page.meta.pageSize) + index + 1,
    },
    {
      id: "name",
      header: "Name",
      cell: (question) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-slate-900 dark:text-white">{question.title}</span>
            {!question.isPublished ? <Badge variant="default" className="bg-slate-100 py-0 text-[10px] text-slate-500">Hidden</Badge> : null}
          </div>
          {question.tags.length > 0 ? (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              tag: {question.tags.map((tag) => tag.name).join(", ")}
            </p>
          ) : null}
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
          {cloneTargets.length > 0 ? <QuestionCloneDialog workspaceId={workspaceId} question={question} targets={cloneTargets} /> : null}
          <Button asChild variant="ghost" size="icon" tooltip="Edit question" className="h-8 w-8 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <Link
              href={`/workspaces/${workspaceId}/questions/${question.id}/edit`}
              onClick={(event) => event.stopPropagation()}
            >
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              void deleteQuestion(question.id);
            }}
            className="h-8 w-8 rounded text-red-600 hover:bg-red-50 hover:text-red-800"
            tooltip="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
        getRowKey={(question) => question.id}
        onRowClick={(question) => router.push(`/workspaces/${workspaceId}/questions/${question.slug}`)}
        emptyMessage={collection.error ?? (search || activeFilters.length > 0 ? "No questions match your search." : "No questions in this workspace yet.")}
        search={
          <DataTableSearch
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setSelectedQuestionIds(new Set());
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
                {editMode && selectedQuestionIds.size > 0 ? (
                  <>
                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-full" onClick={() => setPublicationAction("publish")}>
                      Publish ({selectedQuestionIds.size})
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-full" onClick={() => setPublicationAction("unpublish")}>
                      Unpublish ({selectedQuestionIds.size})
                    </Button>
                  </>
                ) : null}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">Edit Mode</span>
                  <Switch checked={editMode} onCheckedChange={setEditMode} />
                </div>
                <Button asChild size="sm" className="h-9 rounded-full px-4 !text-primary-foreground hover:!text-primary-foreground">
                  <Link href={`/workspaces/${workspaceId}/questions/new`}><Plus className="h-4 w-4" />Add question</Link>
                </Button>
              </>
            ) : null}
          </>
        }
        filters={activeFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            <span className="pl-1 text-xs font-medium uppercase tracking-[0.05em] text-slate-400">Filters:</span>
            {activeFilters.map(({ displayValue, key, label }) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 rounded-full border-slate-200 px-3 text-xs text-slate-700 hover:bg-background hover:text-slate-700"
                onClick={() => {
                  if (key === "tagIds") {
                    setFilterValues((current) => ({ ...current, tagIds: [] }));
                  } else {
                    setFilterValues((current) => ({ ...current, [key]: "" }));
                  }
                  setSelectedQuestionIds(new Set());
                }}
              >
                <span>{label}: {displayValue}</span><X className="h-3 w-3 text-slate-400" />
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500 hover:text-slate-950" onClick={resetFilters}>Clear all</Button>
          </div>
        ) : null}
        pagination={
          <DataTablePagination
            meta={collection.page.meta}
            itemCount={pageItems.length}
            itemName="questions"
            isLoading={collection.isLoading}
            onPageChange={collection.goToPage}
            onPageSizeChange={collection.setPageSize}
          />
        }
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
            <div className="grid gap-2">
              <Label htmlFor="filter-tags" className="pl-2 text-slate-700">Tags</Label>
              <MultiSelect
                id="filter-tags"
                options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
                value={filterDraft.tagIds}
                onChange={(tagIds) => setFilterDraft((current) => ({ ...current, tagIds }))}
                placeholder="Any selected tag"
              />
            </div>
          </div>
          <div className="flex flex-row items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800/60">
            <Button variant="ghost" onClick={resetFilters} className="h-9 rounded-full font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20">Reset</Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFilterDialogOpen(false)} className="h-9 rounded-full border border-slate-200 bg-white px-4 font-semibold text-slate-900 dark:border-slate-800 dark:bg-[#1c1c1e]">Cancel</Button>
              <Button type="button" onClick={() => {
                setFilterValues(filterDraft);
                setSelectedQuestionIds(new Set());
                setIsFilterDialogOpen(false);
              }} className="h-9 rounded-full bg-black px-4 font-semibold !text-white transition-colors hover:bg-zinc-900/90 dark:bg-black dark:hover:bg-zinc-900/90">Apply Filters</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={publicationAction !== null} onOpenChange={(open) => !open && setPublicationAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{publicationAction === "publish" ? "Publish selected questions?" : "Unpublish selected questions?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {publicationAction === "publish"
                ? "Questions without test cases will be skipped and remain drafts."
                : "Selected questions will no longer be visible to students."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={isUpdatingPublication}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" disabled={isUpdatingPublication} onClick={() => void updatePublication()}>
                {isUpdatingPublication ? "Updating…" : publicationAction === "publish" ? "Publish questions" : "Unpublish questions"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
