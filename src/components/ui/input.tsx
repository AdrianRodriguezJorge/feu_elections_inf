import * as React from "react";
import { cn } from "@/lib/utils";

/** Campo de texto base (shadcn/ui). */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-cujae-green-500 focus:ring-2 focus:ring-cujae-green-500/20 focus:outline-hidden aria-[invalid=true]:border-red-500",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
