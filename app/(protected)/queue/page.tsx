import { redirect } from "next/navigation";

import { QueueListView } from "@/components/queue/queue-list-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { getQueueListProjection } from "@/src/queue/read-projection";

type QueuePageProps = {
  searchParams: Promise<{
    status?: string | string[];
    date?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QueuePage({ searchParams }: QueuePageProps) {
  const user = await requireCurrentUser();

  if (user.role === "PATIENT") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const projection = getQueueListProjection(user, {
    status: firstValue(params.status),
    date: firstValue(params.date),
  });

  return <QueueListView role={user.role} projection={projection} />;
}
