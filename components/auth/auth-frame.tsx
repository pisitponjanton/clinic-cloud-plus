import type { ReactNode } from "react";
import Link from "next/link";
import { HeartPulseIcon } from "lucide-react";

import { SkipLink } from "@/components/shared/skip-link";

type AuthFrameProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthFrame({
  title,
  description,
  children,
  footer,
}: AuthFrameProps) {
  return (
    <>
      <SkipLink />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-background outline-none"
      >
        <div className="mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col justify-between border-b border-border bg-surface-context p-page lg:border-r lg:border-b-0">
            <div>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <HeartPulseIcon className="size-5" aria-hidden="true" />
                </span>
                Clinic Cloud +
              </Link>
            </div>

            <div className="my-12 max-w-lg lg:my-0">
              <p className="text-meta font-medium text-primary">Mockup MVP</p>
              <h1 className="mt-2 text-page-title font-semibold tracking-tight">
                {title}
              </h1>
              <p className="mt-3 text-body text-muted-foreground">
                {description}
              </p>

              <div className="mt-8 rounded-lg border border-border bg-card p-4">
                <p className="text-meta font-medium text-muted-foreground">
                  Current context
                </p>
                <p className="mt-1 text-section-title font-semibold">
                  Clinic operations demo
                </p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-meta text-muted-foreground">Data</dt>
                    <dd className="mt-0.5 text-sm font-medium">Synthetic only</dd>
                  </div>
                  <div>
                    <dt className="text-meta text-muted-foreground">Purpose</dt>
                    <dd className="mt-0.5 text-sm font-medium">
                      Workflow experiment
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <p className="text-meta text-muted-foreground">
              Clinic Cloud + uses mock clinic data for demonstration only.
            </p>
          </section>

          <section className="flex items-center justify-center p-page">
            <div className="w-full max-w-md">
              {children}
              {footer ? <div className="mt-6">{footer}</div> : null}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
