import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusFilterSelect } from "@/components/shared/status-filter-select";

describe("status filter select", () => {
  it.each([
    {
      label: "Appointment status",
      defaultValue: "CHECKED_IN",
      statuses: ["SCHEDULED", "CHECKED_IN"],
      expectedLabel: "CHECKED IN",
    },
    {
      label: "Queue status",
      defaultValue: "WAITING",
      statuses: ["WAITING", "CALLED"],
      expectedLabel: "WAITING",
    },
  ])("retains the $label value for GET form submission", ({
    label,
    defaultValue,
    statuses,
    expectedLabel,
  }) => {
    const { container } = render(
      <form method="get">
        <StatusFilterSelect
          id="status-filter"
          label={label}
          descriptionId="status-description"
          defaultValue={defaultValue}
          statuses={statuses}
        />
      </form>,
    );

    expect(screen.getByLabelText(label)).toHaveTextContent(expectedLabel);
    const form = container.querySelector("form");

    expect(form).not.toBeNull();
    expect(new FormData(form!).get("status")).toBe(defaultValue);
  });
});
