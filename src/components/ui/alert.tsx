import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Aviso en línea. `role` se elige según el caso: "alert" para errores, "status" para confirmaciones. */
export const alertVariants = cva("rounded-md border px-4 py-3 text-sm", {
  variants: {
    tone: {
      info: "border-line bg-paper-200 text-ink-800",
      success: "border-action/30 bg-action-50 text-ink-900",
      warn: "border-warn-200 bg-warn-50 text-warn-900",
      danger: "border-danger-200 bg-danger-50 text-danger-900",
    },
  },
  defaultVariants: { tone: "info" },
});

export function Alert({ className, tone, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div className={cn(alertVariants({ tone }), className)} {...props} />;
}
