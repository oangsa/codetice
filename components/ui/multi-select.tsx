"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options…",
  className,
  id,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  function removeItem(optionValue: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  const selectedOptions = options.filter((o) => value.includes(o.value));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors",
        )}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          selectedOptions.map((opt) => (
            <Badge
              key={opt.value}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-medium"
            >
              {opt.label}
              <button
                type="button"
                aria-label={`Remove ${opt.label}`}
                onClick={(e) => removeItem(opt.value, e)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 self-center pl-1">
          {selectedOptions.length > 0 && (
            <button
              type="button"
              aria-label="Clear all"
              onClick={clearAll}
              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className={cn(
            "absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
          )}
        >
          {options.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No options available.</div>
          ) : (
            <ScrollArea className="max-h-60">
              <ul className="p-1">
                {options.map((opt) => {
                  const isSelected = value.includes(opt.value);
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground",
                        isSelected && "bg-accent/50",
                      )}
                    >
                      <span
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      {opt.label}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
