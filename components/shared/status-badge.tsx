import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ClinicStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "WAITING"
  | "CALLED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED";

const statusConfig: Record<
  ClinicStatus,
  { label: string; className: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-status-scheduled text-status-scheduled-foreground",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-status-confirmed text-status-confirmed-foreground",
  },
  CHECKED_IN: {
    label: "Checked in",
    className: "bg-status-active text-status-active-foreground",
  },
  WAITING: {
    label: "Waiting",
    className: "bg-status-active text-status-active-foreground",
  },
  CALLED: {
    label: "Called",
    className: "bg-status-active text-status-active-foreground",
  },
  IN_SERVICE: {
    label: "In service",
    className: "bg-status-active text-status-active-foreground",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-status-completed text-status-completed-foreground",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-status-cancelled text-status-cancelled-foreground",
  },
};

type StatusBadgeProps = {
  status: ClinicStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
