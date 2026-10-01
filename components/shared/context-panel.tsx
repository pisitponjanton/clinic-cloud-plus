import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContextItem = {
  label: string;
  value: ReactNode;
};

type ContextPanelProps = {
  label?: string;
  title: string;
  identifier?: string;
  items?: ContextItem[];
  className?: string;
};

export function ContextPanel({
  label = "Current context",
  title,
  identifier,
  items = [],
  className,
}: ContextPanelProps) {
  return (
    <aside
      aria-label={label}
      className={cn(
        "rounded-lg border border-border bg-surface-context p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-meta font-medium text-muted-foreground">{label}</p>
        <p className="text-section-title font-semibold text-foreground">{title}</p>
        {identifier ? (
          <p className="font-mono text-meta text-muted-foreground">{identifier}</p>
        ) : null}
      </div>

      {items.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-meta text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </aside>
  );
}
