"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function WorkspaceSearch({
  initialQuery,
  children,
}: {
  initialQuery: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function updateSearch(nextValue: string) {
    setValue(nextValue);
    const params = new URLSearchParams();
    const value = nextValue.trim();

    if (value) {
      params.set("q", value.trim());
    }

    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          aria-label="Search workspace"
          value={value}
          onChange={(event) => updateSearch(event.target.value)}
          placeholder="Search workspace"
          className="h-9 rounded-md pl-9"
        />
      </div>
      {children}
    </div>
  );
}
