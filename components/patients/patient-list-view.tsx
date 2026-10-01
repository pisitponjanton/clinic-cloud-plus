import Link from "next/link";
import {
  ArrowRightIcon,
  SearchIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";

import {
  EmptyState,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/src/types/private-data";
import type {
  PatientListItem,
  PatientListProjection,
} from "@/src/patients/list-projection";

type PatientListViewProps = {
  role: Exclude<UserRole, "PATIENT">;
  projection: PatientListProjection;
};

function genderLabel(gender: PatientListItem["gender"]): string {
  switch (gender) {
    case "MALE":
      return "ชาย";
    case "FEMALE":
      return "หญิง";
    case "OTHER":
      return "อื่น ๆ";
  }
}

function PatientMobileRow({ patient }: { patient: PatientListItem }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{patient.fullName}</p>
          <p className="mt-1 font-mono text-meta text-muted-foreground">
            {patient.hn} · {patient.id}
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-context text-primary">
          <UserRoundIcon className="size-4" aria-hidden="true" />
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-meta text-muted-foreground">Phone</dt>
          <dd className="mt-0.5 text-sm font-medium">{patient.phone}</dd>
        </div>
        <div>
          <dt className="text-meta text-muted-foreground">Gender</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {genderLabel(patient.gender)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-meta text-muted-foreground">Date of birth</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {patient.dateOfBirth}
          </dd>
        </div>
      </dl>

      <Link
        href={`/patients/${patient.id}`}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-4 w-full",
        )}
      >
        Open patient
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function PatientListView({
  role,
  projection,
}: PatientListViewProps) {
  const hasQuery = projection.query.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow={role}
        title={role === "DOCTOR" ? "Relevant patients" : "Patients"}
        description={
          role === "DOCTOR"
            ? "Search only patients connected to your assigned appointment, queue, or history context."
            : "Search the clinic demo dataset and open the correct patient context before continuing the workflow."
        }
      />

      <SectionCard
        title="Find a patient"
        description="Search by patient ID, HN, first name, last name, full name, or phone number."
        tone="context"
      >
        <form method="get" action="/patients">
          <FieldGroup className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="patient-search">Search patients</FieldLabel>
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="patient-search"
                  name="q"
                  type="search"
                  defaultValue={projection.query}
                  placeholder="เช่น สมชาย, HN000001, PAT-001"
                  className="pl-9"
                  aria-describedby="patient-search-description"
                />
              </div>
              <FieldDescription id="patient-search-description">
                Results are limited by your authenticated role and data scope.
              </FieldDescription>
            </Field>

            <Button type="submit" size="lg">
              <SearchIcon data-icon="inline-start" aria-hidden="true" />
              Search
            </Button>
          </FieldGroup>
        </form>

        <div
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
          aria-live="polite"
        >
          <p className="text-sm text-muted-foreground">
            {hasQuery ? (
              <>
                Found{" "}
                <span className="font-semibold text-foreground">
                  {projection.resultCount}
                </span>{" "}
                result{projection.resultCount === 1 ? "" : "s"} for “
                {projection.query}” · {projection.totalInScope} patients in your
                scope
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {projection.resultCount}
                </span>{" "}
                patients in your scope
              </>
            )}
          </p>

          {hasQuery ? (
            <Link
              href="/patients"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <XIcon data-icon="inline-start" aria-hidden="true" />
              Clear search
            </Link>
          ) : null}
        </div>
      </SectionCard>

      {projection.items.length === 0 ? (
        <EmptyState
          title="No patients found"
          description={
            hasQuery
              ? "No authorized patient record matches this search. Check the name, HN, patient ID, or phone number and try again."
              : "No patient records are available in your current role scope."
          }
          action={
            hasQuery ? (
              <Link
                href="/patients"
                className={buttonVariants({ variant: "outline" })}
              >
                Clear search
              </Link>
            ) : undefined
          }
        />
      ) : (
        <section aria-label="Patient results">
          <div className="grid gap-3 lg:hidden">
            {projection.items.map((patient) => (
              <PatientMobileRow key={patient.id} patient={patient} />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HN</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date of birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projection.items.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-mono font-medium">
                      {patient.hn}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{patient.fullName}</p>
                        <p className="mt-0.5 font-mono text-meta text-muted-foreground">
                          {patient.id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>{patient.dateOfBirth}</TableCell>
                    <TableCell>{genderLabel(patient.gender)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/patients/${patient.id}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Open patient
                        <ArrowRightIcon
                          data-icon="inline-end"
                          aria-hidden="true"
                        />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
