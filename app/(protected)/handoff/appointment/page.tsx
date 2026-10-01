import type { Metadata } from "next";
import Link from "next/link";

import { AppointmentHandoffConfirmation } from "@/components/handoff/appointment-handoff-confirmation";
import { FeedbackAlert, PageHeader } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireCurrentUser } from "@/src/auth/protected";
import { requireHandoffSecret } from "@/src/handoff/config";
import { resolveAppointmentHandoffForWeb } from "@/src/handoff/appointment-web";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
  referrer: "no-referrer",
};

type AppointmentHandoffPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function AppointmentHandoffPage({
  searchParams,
}: AppointmentHandoffPageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const token = Array.isArray(params.token)
    ? params.token[0]
    : params.token;

  const resolution = token
    ? resolveAppointmentHandoffForWeb(
        user,
        token,
        requireHandoffSecret(),
      )
    : {
        ok: false as const,
        error: {
          code: "INVALID_OR_EXPIRED" as const,
          message:
            "This page requires a valid short-lived prepared-action link from Staff MCP.",
        },
      };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow="Staff MCP → Web"
        title="Confirm prepared appointment action"
        description="Review the action against your authenticated Web session and this browser's current demo state before any localStorage write."
      />

      {!resolution.ok ? (
        <div className="flex flex-col gap-control">
          <FeedbackAlert
            tone={
              resolution.error.code === "IDENTITY_MISMATCH"
                ? "attention"
                : "error"
            }
            title="Prepared action cannot continue"
            description={resolution.error.message}
          />
          <div>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : (
        <AppointmentHandoffConfirmation data={resolution.data} />
      )}
    </div>
  );
}
