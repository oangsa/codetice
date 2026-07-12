import Link from "next/link";
import type { Key, ReactNode } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  headerClassName?: string;
  cellClassName?: string | ((row: T, index: number) => string | undefined);
  cell: (row: T, index: number) => ReactNode;
};

export function DataTable<T>({
  title,
  rows,
  columns,
  getRowKey,
  search,
  actions,
  filters,
  pagination,
  emptyMessage = "No records found.",
  onRowClick,
  rowClassName,
  containerClassName,
}: {
  title?: ReactNode;
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  getRowKey: (row: T, index: number) => Key;
  search?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  pagination?: ReactNode;
  emptyMessage?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: string | ((row: T, index: number) => string | undefined);
  containerClassName?: string;
}) {
  const hasToolbar = title !== undefined || search !== undefined || actions !== undefined;

  return (
    <div className="space-y-3">
      <div className={cn(
        "overflow-hidden rounded-[30px] border border-slate-200 bg-[var(--tint-sm)] shadow-sm dark:border-slate-800/60",
        containerClassName,
      )}>
        {hasToolbar ? (
          <div className="flex flex-col gap-4 p-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {title !== undefined ? <div className="min-w-20 pl-2 text-sm font-semibold text-slate-700">{title}</div> : null}
              {search}
            </div>
            <div className="hidden flex-1 sm:block" />
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}

        {filters}

        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-[var(--tint-sm)] dark:border-slate-800/60">
              {columns.map((column) => (
                <TableHead key={column.id} className={column.headerClassName}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length, 1)} className="py-10 text-center text-sm text-slate-400">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : rows.map((row, index) => (
              <TableRow
                key={getRowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                className={cn(
                  onRowClick && "cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]",
                  typeof rowClassName === "function" ? rowClassName(row, index) : rowClassName,
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={typeof column.cellClassName === "function"
                      ? column.cellClassName(row, index)
                      : column.cellClassName}
                  >
                    {column.cell(row, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pagination}
    </div>
  );
}

export function DataTableSearch({
  value,
  onValueChange,
  placeholder,
  endAdornment,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  endAdornment?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn("h-9 w-64 rounded-full pl-8", endAdornment ? "pr-10" : "pr-3")}
      />
      {endAdornment}
    </div>
  );
}

type DataTablePageAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function DataTablePagination({
  label,
  previous,
  next,
}: {
  label?: ReactNode;
  previous?: DataTablePageAction;
  next?: DataTablePageAction;
}) {
  if (!label && !previous && !next) return null;

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
      <span>{label}</span>
      <div className="flex gap-1">
        {previous ? <PaginationAction action={previous} /> : null}
        {next ? <PaginationAction action={next} /> : null}
      </div>
    </div>
  );
}

function PaginationAction({ action }: { action: DataTablePageAction }) {
  const className = "h-8 rounded-md px-2.5 text-xs";
  if (action.href && !action.disabled) {
    return (
      <Button asChild variant="outline" size="sm" className={className}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  );
}
