"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    textClassName: "text-amber-900",
  },
  attempted: {
    label: "Failed",
    dotClassName: "bg-red-500",
    textClassName: "text-red-900",
  },
  accepted: {
    label: "Passed",
    dotClassName: "bg-green-500",
    textClassName: "text-green-900",
  },
};

export function QuestionTable({
  questions,
  classroomId,
}: {
  questions: QuestionRow[];
  classroomId: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = useMemo(
    () =>
      search
        ? questions.filter((q) => q.title.toLowerCase().includes(search.toLowerCase()))
        : questions,
    [questions, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">
          Your Assignments ({filtered.length})
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
            className="w-56 pl-8"
          />
        </div>
      </div>

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-400">
                  {search ? "No questions match your search." : "No questions in this classroom yet."}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((q) => (
                <TableRow key={q.questionId} className="hover:bg-slate-50">
                  <TableCell className="text-slate-400 tabular-nums">{q.rowNumber}</TableCell>
                  <TableCell>
                    <Link
                      href={`/questions/${q.slug}?assignmentId=${q.assignmentId}`}
                      className="font-medium text-slate-900 hover:text-sky-700"
                    >
                      {q.title}
                    </Link>
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
    </div>
  );
}
