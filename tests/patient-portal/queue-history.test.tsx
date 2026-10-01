import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import MyHistoryError from "@/app/(protected)/me/history/error";
import MyHistoryLoading from "@/app/(protected)/me/history/loading";
import MyQueueError from "@/app/(protected)/me/queue/error";
import MyQueueLoading from "@/app/(protected)/me/queue/loading";
import { PatientHistoryView } from "@/components/patient-portal/patient-history-view";
import { PatientQueueView } from "@/components/patient-portal/patient-queue-view";
import { toAuthUser } from "@/src/auth/user";
import { getUserById } from "@/src/data-access/private";
import {
  getPatientHistoryProjection,
  getPatientQueueProjection,
  type PatientHistoryProjection,
  type PatientQueueProjection,
} from "@/src/patient-portal/queue-history-projection";

function user(userId: string) {
  const seeded = getUserById(userId);

  if (!seeded) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(seeded);
}

const patient = user("USR-PATIENT-001");
const staff = user("USR-STAFF-001");

describe("patient queue/history projections", () => {
  it("returns only PAT-001 queue records for the linked patient", () => {
    const projection = getPatientQueueProjection(patient);

    expect(projection).toMatchObject({
      patientId: "PAT-001",
      patientName: "สมชาย ใจดี",
      hn: "HN000001",
    });
    expect(projection.queue).toEqual([
      expect.objectContaining({
        id: "QUEUE-001",
        queueNumber: "A001",
        status: "WAITING",
        appointmentId: "APT-001",
        doctorName: "นพ. สาธิต เมตตา",
      }),
    ]);
  });

  it("returns only PAT-001 history, newest first", () => {
    const projection = getPatientHistoryProjection(patient);

    expect(projection.history.map((entry) => entry.id)).toEqual([
      "HIST-021",
      "HIST-001",
    ]);
    expect(
      projection.history.every((entry) =>
        entry.summary.includes("Synthetic demo"),
      ),
    ).toBe(true);
  });

  it("rejects personnel identities from patient queue/history projections", () => {
    expect(() => getPatientQueueProjection(staff)).toThrow(
      "Patient portal requires a linked PATIENT identity",
    );
    expect(() => getPatientHistoryProjection(staff)).toThrow(
      "Patient portal requires a linked PATIENT identity",
    );
  });
});

describe("patient queue/history UI", () => {
  it("renders own queue context without internal mutation controls", () => {
    render(<PatientQueueView projection={getPatientQueueProjection(patient)} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "My queue" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/สมชาย ใจดี.*HN000001/)).toBeInTheDocument();
    expect(screen.getByText("A001")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("APT-001")).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /call|serve|complete|cancel queue|next queue/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("renders synthetic own history without internal workflow links", () => {
    render(
      <PatientHistoryView projection={getPatientHistoryProjection(patient)} />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "My history" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/สมชาย ใจดี.*HN000001/)).toBeInTheDocument();
    expect(screen.getByText("HIST-021")).toBeInTheDocument();
    expect(screen.getByText("HIST-001")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Synthetic demo follow-up history for the A/B scenario. No real clinical information.",
      ),
    ).toBeInTheDocument();

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders independent empty states", () => {
    const emptyQueue: PatientQueueProjection = {
      patientId: "PAT-TEST",
      patientName: "Demo Patient",
      hn: "HNTEST",
      queue: [],
    };
    const emptyHistory: PatientHistoryProjection = {
      patientId: "PAT-TEST",
      patientName: "Demo Patient",
      hn: "HNTEST",
      history: [],
    };

    const { rerender } = render(
      <PatientQueueView projection={emptyQueue} />,
    );
    expect(screen.getByText("No queue entries")).toBeInTheDocument();

    rerender(<PatientHistoryView projection={emptyHistory} />);
    expect(screen.getByText("No history available")).toBeInTheDocument();
  });

  it("renders bounded loading and retryable error states", async () => {
    const actor = userEvent.setup();
    const retry = vi.fn();

    const { rerender } = render(<MyQueueLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading my queue");

    rerender(<MyHistoryLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading my history");

    rerender(<MyQueueError reset={retry} />);
    await actor.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(<MyHistoryError reset={retry} />);
    await actor.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(2);
  });
});
