import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const verdictVariants = {
  accepted: "bg-green-50 border-green-300 text-green-900",
  late: "bg-amber-50 border-amber-400 text-amber-800",
  wrong: "bg-red-50 border-red-300 text-red-900",
  tle: "bg-amber-50 border-amber-300 text-amber-900",
  runtime: "bg-orange-50 border-orange-300 text-orange-900",
  compile: "bg-gray-100 border-gray-300 text-gray-900",
  mle: "bg-purple-50 border-purple-300 text-purple-900",
} as const;

export type VerdictVariant = keyof typeof verdictVariants;

export function VerdictBadge({
  verdict,
  className,
  ...props
}: Omit<BadgeProps, "variant"> & { verdict: VerdictVariant }) {
  return (
    <Badge
      variant="outline"
      className={cn(verdictVariants[verdict], className)}
      {...props}
    />
  );
}
