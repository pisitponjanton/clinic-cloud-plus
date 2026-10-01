"use client";

import type { ReactNode } from "react";
import { CircleAlertIcon, ShieldCheckIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmationDialogProps = {
  triggerLabel: string;
  title: string;
  description: string;
  details?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  onConfirm?: () => void;
  disabled?: boolean;
};

export function ConfirmationDialog({
  triggerLabel,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  disabled = false,
}: ConfirmationDialogProps) {
  const destructive = tone === "destructive";
  const Icon = destructive ? CircleAlertIcon : ShieldCheckIcon;

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={disabled}
        render={
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={disabled}
          />
        }
      >
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia
            className={
              destructive
                ? "bg-status-cancelled text-status-cancelled-foreground"
                : "bg-surface-context text-primary"
            }
          >
            <Icon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {details ? (
          <div className="rounded-lg border border-border bg-surface-subtle p-4">
            {details}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}