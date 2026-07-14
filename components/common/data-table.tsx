import Link from "next/link";
import type { Key, ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAGE_SIZE_OPTIONS, type PaginationMeta } from "@/lib/pagination";
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
        "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950",
        containerClassName,
      )}>
        {hasToolbar ? (
          <div className="flex flex-col gap-3 border-b border-slate-200 px-3 py-3 sm:flex-row sm:items-center dark:border-slate-800">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {title !== undefined ? <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div> : null}
              {search}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto">{actions}</div> : null}
          </div>
        ) : null}

        {filters ? <div className="border-b border-slate-200 dark:border-slate-800">{filters}</div> : null}

        <Table className="[&_th]:h-10 [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2">
          <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50">
            <TableRow className="border-slate-200 bg-transparent dark:border-slate-800">
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
        {pagination ? (
          <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
            {pagination}
          </div>
        ) : null}
      </div>
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
  meta,
  itemCount,
  itemName = "items",
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  getPageHref,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  label,
  previous,
  next,
}: {
  meta?: PaginationMeta;
  itemCount?: number;
  itemName?: string;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  getPageHref?: (page: number) => string;
  pageSizeOptions?: readonly number[];
  label?: ReactNode;
  previous?: DataTablePageAction;
  next?: DataTablePageAction;
}) {
  if (meta) {
    const resolvedItemCount = itemCount ?? meta.pageSize;
    const start = meta.totalCount === 0 ? 0 : (meta.currentPage - 1) * meta.pageSize + 1;
    const end = Math.min(start + resolvedItemCount - 1, meta.totalCount);
    const rangeLabel = isLoading
      ? "Loading..."
      : meta.totalCount === 0 || resolvedItemCount === 0
        ? `0 ${itemName}`
        : `${start}-${end} of ${meta.totalCount} ${itemName}`;
    const pageNumbers = getPageNumbers(meta.currentPage, meta.totalPages);
    const createPageChangeHandler = onPageChange
      ? (page: number) => () => onPageChange(page)
      : undefined;

    return (
      <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span>{rangeLabel}</span>
          {onPageSizeChange ? (
            <Select
              value={String(meta.pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>{pageSize} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-1">
          <PaginationIconButton
            tooltip="First page"
            disabled={isLoading || !meta.hasPrevious}
            href={getPageHref?.(1)}
            onClick={createPageChangeHandler?.(1)}
          >
            <ChevronsLeft />
          </PaginationIconButton>
          <PaginationIconButton
            tooltip="Previous page"
            disabled={isLoading || !meta.hasPrevious}
            href={getPageHref?.(meta.currentPage - 1)}
            onClick={createPageChangeHandler?.(meta.currentPage - 1)}
          >
            <ChevronLeft />
          </PaginationIconButton>
          {pageNumbers.map((page) => (
            <PaginationPageButton
              key={page}
              page={page}
              active={page === meta.currentPage}
              disabled={isLoading || page === meta.currentPage}
              href={page === meta.currentPage ? undefined : getPageHref?.(page)}
              onClick={createPageChangeHandler?.(page)}
            />
          ))}
          <PaginationIconButton
            tooltip="Next page"
            disabled={isLoading || !meta.hasNext}
            href={getPageHref?.(meta.currentPage + 1)}
            onClick={createPageChangeHandler?.(meta.currentPage + 1)}
          >
            <ChevronRight />
          </PaginationIconButton>
          <PaginationIconButton
            tooltip="Last page"
            disabled={isLoading || !meta.hasNext}
            href={getPageHref?.(meta.totalPages)}
            onClick={createPageChangeHandler?.(meta.totalPages)}
          >
            <ChevronsRight />
          </PaginationIconButton>
        </div>
      </div>
    );
  }

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

function getPageNumbers(currentPage: number, totalPages: number) {
  const windowSize = 5;
  const start = Math.max(1, Math.min(currentPage - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);
  return Array.from({ length: Math.max(end - start + 1, 0) }, (_, index) => start + index);
}

function PaginationIconButton({
  tooltip,
  disabled,
  href,
  onClick,
  children,
}: {
  tooltip: string;
  disabled: boolean;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className = "h-8 w-8";
  if (href && !disabled) {
    return (
      <Button asChild tooltip={tooltip} aria-label={tooltip} variant="outline" size="icon" className={className}>
        <Link href={href}>{children}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      tooltip={tooltip}
      aria-label={tooltip}
      variant="outline"
      size="icon"
      className={className}
      disabled={disabled}
      {...(onClick ? { onClick } : {})}
    >
      {children}
    </Button>
  );
}

function PaginationPageButton({
  page,
  active,
  disabled,
  href,
  onClick,
}: {
  page: number;
  active: boolean;
  disabled: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const className = "h-8 min-w-8 px-2 text-xs";
  const variant = active ? "default" : "outline";
  if (href && !disabled) {
    return (
      <Button asChild variant={variant} size="sm" className={className}>
        <Link href={href}>{page}</Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      disabled={disabled}
      {...(onClick ? { onClick } : {})}
    >
      {page}
    </Button>
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
      {...(action.onClick ? { onClick: action.onClick } : {})}
    >
      {action.label}
    </Button>
  );
}
