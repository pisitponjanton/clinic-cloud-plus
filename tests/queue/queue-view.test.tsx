import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import QueueError from "@/app/(protected)/queue/error";
import QueueLoading from "@/app/(protected)/queue/loading";
import { QueueListView } from "@/components/queue/queue-list-view";
import { toAuthUser } from "@/src/auth/user";
import { getUserById } from "@/src/data-access/private";
import {
  getQueueListProjection,
  type QueueListProjection,
} from "@/src/queue/read-projection";

function user(userId: string) {
  const seeded = getUserById(userId);

  if (!seeded) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(seeded);
}

const staff = user("USR-STAFF-001");
const doctor = user("USR-DOCTOR-001");

describe("queue read projection", () => {
  it("returns the full Base Queue scope for STAFF", () => {
    const projection = getQueueListProjection(staff);

    expect(projection.totalInScope).toBe(8);
    expect(projection.resultCount).toBe(8);
    expect(projection.statusCounts).toEqual({
      WAITING: 5,
      CALLED: 2,
      IN_SERVICE: 1,
      COMPLETED: 0,
      CANCELLED: 0,
    });
    expect(projection.items[0]).toMatchObject({
      id: "QUEUE-001",
      queueNumber: "A001",
      patientId: "PAT-001",
      patientHn: "HN000001",
      patientName: "สมชาย ใจดี",
      doctorId: "DOC-001",
      appointmentId: "APT-001",
      status: "WAITING",
      date: "2026-10-01",
    });
  });

  it("limits DOCTOR queue to linked doctor relevance", () => {
    const projection = getQueueListProjection(doctor);

    expect(projection.totalInScope).toBe(2);
    expect(projection.items.map((item) => item.id)).toEqual([
      "QUEUE-001",
      "QUEUE-005",
    ]);
    expect(
      projection.items.every((item) => item.doctorId === "DOC-001"),
    ).toBe(true);
  });

  it("filters status and date only after role scope is resolved", () => {
    const projection = getQueueListProjection(doctor, {
      status: "waiting",
      date: "2026-10-01",
    });

    expect(projection.status).toBe("WAITING");
    expect(projection.date).toBe("2026-10-01");
    expect(projection.totalInScope).toBe(2);
    expect(projection.resultCount).toBe(2);
    expect(
      projection.items.every(
        (item) =>
          item.status === "WAITING" &&
          item.date === "2026-10-01" &&
          item.doctorId === "DOC-001",
      ),
    ).toBe(true);
  });

  it("treats unknown status as no status filter without broadening scope", () => {
    const projection = getQueueListProjection(doctor, {
      status: "NOT_A_STATUS",
    });

    expect(projection.status).toBeNull();
    expect(projection.resultCount).toBe(2);
    expect(projection.totalInScope).toBe(2);
  });
});

describe("queue UI", () => {
  it("renders read-only queue context, statuses, and workflow links", () => {
    const projection = getQueueListProjection(staff);

    render(<QueueListView role="STAFF" projection={projection} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Queue" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Read-only Base Queue")).toBeInTheDocument();
    expect(screen.getByLabelText("Queue status")).toHaveAttribute(
      "aria-describedby",
      "queue-status-description",
    );
    expect(screen.getByLabelText("Queue status")).toHaveClass("min-h-11");
    expect(screen.getByLabelText("Date")).toHaveAttribute(
      "aria-describedby",
      "queue-date-description",
    );
    expect(screen.getByLabelText("Date")).toHaveClass("min-h-11");
    expect(screen.getAllByText("A001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("สมชาย ใจดี").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Waiting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("นพ. สาธิต เมตตา").length).toBeGreaterThan(0);

    expect(
      screen.getAllByRole("link", { name: "Open patient" })[0],
    ).toHaveAttribute("href", "/patients/PAT-001");
    expect(
      screen.getAllByRole("link", { name: /Open appointment/ })[0],
    ).toHaveAttribute("href", "/appointments/APT-001");

    expect(
      screen.queryByRole("button", { name: /next queue|call queue|complete queue/i }),
    ).not.toBeInTheDocument();
  });

  it("shows doctor-specific wording for DOCTOR queue scope", () => {
    render(
      <QueueListView
        role="DOCTOR"
        projection={getQueueListProjection(doctor)}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Relevant queue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/assigned to your linked doctor identity/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 queue entries/)).toBeInTheDocument();
  });

  it("renders an actionable empty state for filtered queue results", () => {
    const projection = getQueueListProjection(staff, {
      status: "COMPLETED",
    });

    expect(projection.resultCount).toBe(0);

    render(<QueueListView role="STAFF" projection={projection} />);

    expect(screen.getByText("No queue entries found")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Clear filters" }).length,
    ).toBeGreaterThan(0);
  });

  it("renders loading and retryable error states", async () => {
    const retry = vi.fn();
    const actor = userEvent.setup();

    const { rerender } = render(<QueueLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading queue entries",
    );

    rerender(
      <QueueError
        error={new Error("test")}
        reset={retry}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Queue unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Could not load queue")).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("does not expose queue mutation controls in a synthetic empty projection", () => {
    const projection: QueueListProjection = {
      status: null,
      date: "",
      totalInScope: 0,
      resultCount: 0,
      items: [],
      statusCounts: {
        WAITING: 0,
        CALLED: 0,
        IN_SERVICE: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      },
    };

    render(<QueueListView role="NURSE" projection={projection} />);

    expect(screen.getByText("No queue entries found")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /call|serve|complete|cancel queue/i }),
    ).not.toBeInTheDocument();
  });
});
