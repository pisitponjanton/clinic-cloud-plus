import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  HeartPulseIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { SkipLink } from "@/components/shared/skip-link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getClinic, getServices } from "@/src/data-access/public";

export default function Home() {
  const clinic = getClinic();
  const services = getServices();

  return (
    <>
      <SkipLink />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-background outline-none">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-page">
        <header className="flex items-center justify-between border-b border-border py-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulseIcon className="size-5" aria-hidden="true" />
            </span>
            Clinic Cloud +
          </div>

          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" })}
          >
            Sign in
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-section py-12 lg:grid-cols-[1.08fr_0.92fr] lg:py-16">
          <div className="max-w-2xl">
            <p className="text-meta font-medium text-primary">
              Clinic workflow mockup MVP
            </p>
            <h1 className="mt-3 text-page-title font-semibold tracking-tight sm:max-w-xl">
              ทดลอง workflow คลินิกผ่าน Web และ role ที่แตกต่างกันบนข้อมูลจำลองชุดเดียว
            </h1>
            <p className="mt-4 max-w-xl text-body text-muted-foreground">
              {clinic.name} ใช้ synthetic data เพื่อสาธิต patient context,
              appointments และ queue โดยไม่ใช้ข้อมูลผู้ป่วยจริง
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className={buttonVariants({ size: "lg" })}
              >
                Sign in with Demo Account
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                View Signup demo
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="flex gap-3 rounded-lg border border-border bg-card p-4">
                <ShieldCheckIcon
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Role-aware access</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    OWNER, STAFF, DOCTOR, NURSE และ PATIENT ใช้ขอบเขตข้อมูลต่างกัน
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-lg border border-border bg-card p-4">
                <CalendarCheckIcon
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Shared demo dataset</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {services.length} services พร้อมข้อมูล workflow สำหรับการทดลอง
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="bg-surface-context">
            <CardHeader>
              <CardTitle className="text-section-title">
                Demo context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <div className="border-b border-border pb-4">
                  <dt className="text-meta text-muted-foreground">Clinic</dt>
                  <dd className="mt-1 font-medium">{clinic.name}</dd>
                </div>
                <div className="border-b border-border pb-4">
                  <dt className="text-meta text-muted-foreground">Data</dt>
                  <dd className="mt-1 font-medium">Synthetic / mock only</dd>
                </div>
                <div className="border-b border-border pb-4">
                  <dt className="text-meta text-muted-foreground">
                    Demo password
                  </dt>
                  <dd className="mt-1 font-mono font-medium">12345678</dd>
                </div>
                <div>
                  <dt className="text-meta text-muted-foreground">
                    Primary next step
                  </dt>
                  <dd className="mt-2">
                    <Link
                      href="/login"
                      className={cn(
                        buttonVariants({ variant: "link" }),
                        "px-0",
                      )}
                    >
                      Choose a role and sign in
                    </Link>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </section>

        <footer className="border-t border-border py-4 text-meta text-muted-foreground">
          Mockup MVP — ไม่ใช้ข้อมูลผู้ป่วยจริง
        </footer>
      </div>
      </main>
    </>
  );
}