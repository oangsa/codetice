"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Trash2, Edit, Filter, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn, formatScore, formatDate } from "@/lib/utils";

type QuestionRow = {
  rowNumber: number;
  assignmentId: string;
  assignmentTitle: string;
  dueAt: Date | null;
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

const statusVariants: Record<QuestionRow["status"], { label: string; dotClassName: string; textClassName: string }> = {
  todo: {
    label: "Todo",
    dotClassName: "bg-amber-400",
    textClassName: "text-slate-950",
  },
  attempted: {
    label: "Failed",
    dotClassName: "bg-red-500",
    textClassName: "text-slate-950",
  },
  accepted: {
    label: "Passed",
    dotClassName: "bg-green-500",
    textClassName: "text-slate-950",
  },
};

const FILTER_FIELDS = [
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
];

export function QuestionTable({
  questions,
  classroomId,
  canManage = false,
}: {
  questions: QuestionRow[];
  classroomId: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    difficulty: "",
    status: "",
  });
  const [filterDraft, setFilterDraft] = useState<Record<string, string>>({
    difficulty: "",
    status: "",
  });
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const PAGE_SIZE = 10;

  const visibleQuestions = useMemo(() => {
    return editMode ? questions : questions.filter((q) => q.isPublished);
  }, [questions, editMode]);

  const activeFilters = useMemo(() => {
    return FILTER_FIELDS.filter((f) => !!filterValues[f.key]).map((f) => {
      const rawValue = filterValues[f.key];
      const displayValue = f.options.find((o) => o.value === rawValue)?.label ?? rawValue;
      return { field: f, rawValue, displayValue };
    });
  }, [filterValues]);

  const activeFilterCount = activeFilters.length;

  const handleFilterDialogOpen = () => {
    setFilterDraft(filterValues);
    setIsFilterDialogOpen(true);
  };

  const handleFilterDraftChange = (fieldKey: string, value: string) => {
    setFilterDraft((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleApplyFilters = () => {
    setFilterValues(filterDraft);
    setPage(1);
    setIsFilterDialogOpen(false);
  };

  const handleResetFilters = () => {
    const emptyFilters = { difficulty: "", status: "" };
    setFilterDraft(emptyFilters);
    setFilterValues(emptyFilters);
    setPage(1);
    setIsFilterDialogOpen(false);
  };

  const handleClearSingleFilter = (fieldKey: string) => {
    setFilterValues((prev) => ({
      ...prev,
      [fieldKey]: "",
    }));
    setPage(1);
  };

  const filtered = useMemo(() => {
    return visibleQuestions.filter((q) => {
      const matchesSearch = search ? q.title.toLowerCase().includes(search.toLowerCase()) : true;
      const matchesLevel = filterValues.difficulty ? q.difficulty.toLowerCase() === filterValues.difficulty.toLowerCase() : true;
      const matchesStatus = filterValues.status ? q.status.toLowerCase() === filterValues.status.toLowerCase() : true;
      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [visibleQuestions, search, filterValues]);

  async function handleDelete(questionId: string) {
    if (!confirm("Are you sure you want to delete this question? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete question.");
      }

      toast.success("Question deleted successfully.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete question.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-slate-700 mr-1">
            Questions ({filtered.length})
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-48 pl-8 h-9 bg-white shadow-sm"
            />
          </div>

          <Button
            type="button"
            variant={activeFilterCount > 0 ? "default" : "outline"}
            size="sm"
            onClick={handleFilterDialogOpen}
            className="h-9 shadow-sm gap-1.5 data-[state=active]:text-primary-foreground"
          >
            <Filter className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <div>
          {canManage ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={editMode ? "default" : "outline"}
                onClick={() => setEditMode(!editMode)}
                className="h-9 shadow-sm"
              >
                {editMode ? "Edit Mode: ON" : "Edit Mode: OFF"}
              </Button>
              <Button
                asChild
                size="sm"
                className="h-9 !text-primary-foreground hover:!text-primary-foreground"
              >
                <Link href={`/classrooms/${classroomId}/questions/new`}>
                  <Plus className="h-4 w-4" />
                  Add question
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 py-1">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Filters:
          </span>
          {activeFilters.map(({ displayValue, field }) => (
            <Button
              key={field.key}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 rounded-full px-3 text-slate-700 border-slate-200"
              onClick={() => handleClearSingleFilter(field.key)}
            >
              <span>
                {field.label}: {displayValue}
              </span>
              <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-slate-500 hover:text-slate-950"
            onClick={handleResetFilters}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
                      <TableRow className="bg-slate-50">
              <TableHead className="w-12">No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-24">Level</TableHead>
              <TableHead className="w-40">Due date</TableHead>
              <TableHead className="w-24 text-right">Submission</TableHead>
              <TableHead className="w-24 text-right">Score</TableHead>
              <TableHead className="w-24 text-right">Status</TableHead>
              {editMode && <TableHead className="w-24 text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
              <TableCell colSpan={editMode ? 8 : 7} className="py-10 text-center text-sm text-slate-400">
                  {search ? "No questions match your search." : "No questions in this classroom yet."}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((q) => (
                <TableRow key={q.questionId} className="hover:bg-slate-50">
                  <TableCell className="text-slate-400 tabular-nums">{q.rowNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/questions/${q.slug}?assignmentId=${q.assignmentId}&classroomId=${classroomId}`}
                        className="font-medium text-slate-900 hover:text-sky-700"
                      >
                        {q.title}
                      </Link>
                      {!q.isPublished && (
                        <Badge variant="default" className="bg-slate-100 text-slate-500 hover:bg-slate-100 py-0 text-[10px]">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{q.assignmentTitle}</p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        difficultyVariants[q.difficulty] ?? "bg-slate-100 text-slate-900",
                      )}
                    >
                      {q.difficulty}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {q.dueAt ? (
                      <span className="flex flex-col gap-0.5">
                        <span>{formatDate(q.dueAt)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">No due date</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-600">
                    {q.attempts > 0 ? q.attempts : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-slate-900">
                    {q.bestScore ? formatScore(q.bestScore) : "None"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          statusVariants[q.status].dotClassName,
                        )}
                      />
                      <span className={statusVariants[q.status].textClassName}>
                        {statusVariants[q.status].label}
                      </span>
                    </span>
                  </TableCell>
                  {editMode && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/questions/${q.questionId}/edit?classroomId=${classroomId}&backUrl=${encodeURIComponent(`/classrooms/${classroomId}`)}`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="Edit question"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(q.questionId)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
                          title="Delete question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Questions</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {FILTER_FIELDS.map((field) => (
              <div className="grid gap-2" key={field.key}>
                <Label htmlFor={`filter-${field.key}`}>{field.label}</Label>
                <Select
                  value={filterDraft[field.key] || "all"}
                  onValueChange={(value) =>
                    handleFilterDraftChange(field.key, value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger id={`filter-${field.key}`} className="w-full bg-white">
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {field.label}s</SelectItem>
                    {field.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={handleResetFilters}>
              Reset
            </Button>
            <Button variant="outline" onClick={() => setIsFilterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
