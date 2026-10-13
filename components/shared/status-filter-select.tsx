"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilterSelectProps = {
  id: string;
  label: string;
  descriptionId: string;
  defaultValue: string;
  statuses: readonly string[];
};

function formatStatus(value: string): string {
  return value === "ALL" ? "All statuses" : value.replaceAll("_", " ");
}

export function StatusFilterSelect({
  id,
  label,
  descriptionId,
  defaultValue,
  statuses,
}: StatusFilterSelectProps) {
  return (
    <Select
      name="status"
      defaultValue={defaultValue}
      itemToStringLabel={(value) => formatStatus(String(value))}
    >
      <SelectTrigger
        id={id}
        className="w-full"
        aria-label={label}
        aria-describedby={descriptionId}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All statuses</SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {formatStatus(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
