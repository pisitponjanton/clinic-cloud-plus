import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import {
  ConfirmationDialog,
  ContextPanel,
  EmptyState,
  FeedbackAlert,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusBadge,
  TextField,
} from "@/components/shared";

describe("shared UI primitives", () => {
  it("renders a semantic page header with an accessible primary heading", () => {
    render(
      <PageHeader
        title="Patients"
        description="Search and open patient context."
        actions={<Button>Search patients</Button>}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Patients" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Search patients" }),
    ).toBeInTheDocument();
  });

  it("renders context and section surfaces without losing their labels", () => {
    render(
      <>
        <ContextPanel
          label="Patient"
          title="Somchai Demo"
          identifier="PAT-001"
          items={[{ label: "Status", value: "Confirmed" }]}
        />
        <SectionCard title="Latest appointment">10:30</SectionCard>
      </>,
    );

    expect(screen.getByRole("complementary", { name: "Patient" })).toBeInTheDocument();
    expect(screen.getByText("PAT-001")).toBeInTheDocument();
    expect(screen.getByText("Latest appointment")).toBeInTheDocument();
  });

  it.each([
    ["SCHEDULED", "Scheduled"],
    ["CONFIRMED", "Confirmed"],
    ["CHECKED_IN", "Checked in"],
    ["WAITING", "Waiting"],
    ["CALLED", "Called"],
    ["IN_SERVICE", "In service"],
    ["COMPLETED", "Completed"],
    ["CANCELLED", "Cancelled"],
  ] as const)("maps %s to the visible status label %s", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("connects field label, help text, and validation error", () => {
    render(
      <TextField
        id="email"
        label="Email"
        description="Use a demo account email."
        error="Email is required."
        required
      />,
    );

    const input = screen.getByRole("textbox", { name: /Email/ });

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "email-description email-error",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Email is required.");
  });

  it("uses explicit feedback semantics for error, empty, and loading states", () => {
    const { rerender } = render(
      <FeedbackAlert
        tone="error"
        title="Appointment could not be created"
        description="Choose another time and try again."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Appointment could not be created",
    );

    rerender(
      <EmptyState
        title="No appointments found"
        description="Try another date."
      />,
    );
    expect(screen.getByText("No appointments found")).toBeInTheDocument();

    rerender(<LoadingState label="Loading appointments" rows={2} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading appointments");
  });

  it("moves focus into confirmation dialog, supports Escape, and restores trigger focus", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmationDialog
        triggerLabel="Cancel appointment"
        title="Cancel this appointment?"
        description="The appointment will be marked as cancelled."
        confirmLabel="Cancel appointment"
        tone="destructive"
        onConfirm={onConfirm}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Cancel appointment" });
    await user.click(trigger);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps shared interactive controls at the 44px minimum target", () => {
    render(
      <>
        <Button>Primary action</Button>
        <TextField id="target-input" label="Target input" />
      </>,
    );

    expect(screen.getByRole("button", { name: "Primary action" })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
    expect(screen.getByRole("textbox", { name: "Target input" })).toHaveClass(
      "min-h-11",
    );
  });
});
