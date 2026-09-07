"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { serializeCsv, type CsvColumn } from "@/lib/csv";

export function DataTableCsvExport<T>({
  columns,
  disabled = false,
  filename,
  loadRows,
}: {
  columns: readonly CsvColumn<T>[];
  disabled?: boolean;
  filename: string;
  loadRows: () => Promise<readonly T[]>;
}) {
  const [isExporting, setIsExporting] = useState(false);

  async function exportCsv() {
    if (disabled || isExporting) return;
    setIsExporting(true);
    try {
      const rows = await loadRows();
      if (rows.length === 0) {
        toast.info("There are no rows to export.");
        return;
      }
      const blob = new Blob([serializeCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export CSV.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 rounded-full"
      tooltip="Download CSV"
      aria-label="Download CSV"
      disabled={disabled || isExporting}
      onClick={() => void exportCsv()}
    >
      {isExporting
        ? <LoaderCircle className="h-4 w-4 animate-spin" />
        : <Download className="h-4 w-4" />}
    </Button>
  );
}
