import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Etiqueta de estado. Texto legible (≥12 px) y en minúsculas de oración. */
export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", {
  variants: {
    tone: {
      neutral: "bg-paper-200 text-ink-800",
      action: "bg-action-50 text-action",
      warn: "bg-warn-50 text-warn-900",
      danger: "bg-danger-50 text-danger-900",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
