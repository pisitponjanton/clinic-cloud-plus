import type { ReactNode } from "react";
import {
  AlertCircleIcon,
  CircleCheckIcon,
  InfoIcon,
  SearchXIcon,
  TriangleAlertIcon,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type FeedbackTone = "info" | "success" | "attention" | "error";

const feedbackTone = {
  info: {
    icon: InfoIcon,
    className: "border-info-border bg-info text-info-foreground",
  },
  success: {
    icon: CircleCheckIcon,
    className: "border-success-border bg-success text-success-foreground",
  },
  attention: {
    icon: TriangleAlertIcon,
    className: "border-attention-border bg-attention text-attention-foreground",
  },
  error: {
    icon: AlertCircleIcon,
    className:
      "border-destructive/30 bg-status-cancelled text-status-cancelled-foreground",
  },
} as const;

type FeedbackAlertProps = {
  title: string;
  description?: ReactNode;
  tone?: FeedbackTone;
  className?: string;
};

export function FeedbackAlert({
  title,
  description,
  tone = "info",
  className,
}: FeedbackAlertProps) {
  const config = feedbackTone[tone];
  const Icon = config.icon;

  return (
    <Alert
      className={cn(
        config.className,
        "[&_[data-slot=alert-description]]:text-current/85",
        className,
      )}
    >
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
    </Alert>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn("border border-border bg-card", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

type LoadingStateProps = {
  label?: string;
  rows?: number;
  className?: string;
};

export function LoadingState({
  label = "Loading",
  rows = 3,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Spinner aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="mt-4 flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton
            key={index}
            className={cn("h-4", index === rows - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}
