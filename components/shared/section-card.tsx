import type { ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: "default" | "context" | "subtle";
  className?: string;
  contentClassName?: string;
};

const toneClasses = {
  default: "bg-card",
  context: "bg-surface-context",
  subtle: "bg-surface-subtle",
} as const;

export function SectionCard({
  title,
  description,
  action,
  children,
  tone = "default",
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn(toneClasses[tone], className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-control", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
