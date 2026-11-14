import * as React from "react";
import { cn } from "@/lib/utils";

/** Campo de texto base (shadcn/ui). */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full min-h-11 rounded-lg border border-line-strong bg-white px-3 py-2 text-base text-ink-900 placeholder:text-ink-500 focus:border-action focus:ring-2 focus:ring-action/20 focus:outline-hidden aria-[invalid=true]:border-red-500",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
