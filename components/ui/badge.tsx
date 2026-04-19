import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger";

const variantStyles: Record<BadgeVariant, string> = {
  default: "border-slate-700 text-slate-300",
  success: "border-emerald-500/30 text-emerald-300",
  warning: "border-amber-500/30 text-amber-300",
  danger: "border-rose-500/30 text-rose-300",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
