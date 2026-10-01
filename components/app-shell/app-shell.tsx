"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  FlaskConicalIcon,
  HeartPulseIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  StethoscopeIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

import { SkipLink } from "@/components/shared/skip-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/src/auth/user";
import {
  getActiveNavigationHref,
  getNavigationItems,
  type AppNavIcon,
  type AppNavItem,
} from "@/src/navigation/app-navigation";

type AppShellProps = {
  user: AuthUser;
  children: ReactNode;
};

const ICONS: Record<AppNavIcon, typeof LayoutDashboardIcon> = {
  dashboard: LayoutDashboardIcon,
  patients: UsersIcon,
  appointments: CalendarDaysIcon,
  queue: ClipboardListIcon,
  settings: SettingsIcon,
  "demo-settings": FlaskConicalIcon,
  profile: UserRoundIcon,
  history: HistoryIcon,
};

function NavigationList({
  items,
  activeHref,
  onNavigate,
}: {
  items: AppNavItem[];
  activeHref: string | null;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = activeHref === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-10 justify-start gap-3 px-3 text-left",
              active &&
                "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserSummary({ user }: { user: AuthUser }) {
  return (
    <div className="rounded-lg border border-sidebar-border bg-surface-subtle p-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-context text-primary">
          {user.role === "DOCTOR" ? (
            <StethoscopeIcon className="size-4" aria-hidden="true" />
          ) : (
            <UserRoundIcon className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {user.displayName}
          </p>
          <p className="mt-0.5 truncate text-meta text-muted-foreground">
            {user.email}
          </p>
          <Badge variant="outline" className="mt-2">
            {user.role}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <Button
        type="submit"
        variant="ghost"
        className="w-full justify-start gap-3 text-muted-foreground"
      >
        <LogOutIcon className="size-4" aria-hidden="true" />
        Logout
      </Button>
    </form>
  );
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = getNavigationItems(user.role);
  const activeHref = getActiveNavigationHref(pathname, items);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <SkipLink />

      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="border-b border-sidebar-border p-4">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <HeartPulseIcon className="size-5" aria-hidden="true" />
            </span>
            Clinic Cloud +
          </Link>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-3">
          <NavigationList items={items} activeHref={activeHref} />
          <div className="mt-auto flex flex-col gap-3">
            <UserSummary user={user} />
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-page backdrop-blur lg:hidden">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulseIcon className="size-4" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">Clinic Cloud +</span>
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{user.role}</Badge>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Open navigation"
                  />
                }
              >
                <MenuIcon aria-hidden="true" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(22rem,88vw)]">
                <SheetHeader className="border-b border-border">
                  <SheetTitle>Clinic Cloud +</SheetTitle>
                  <SheetDescription>
                    {user.role === "PATIENT"
                      ? "Your personal clinic navigation"
                      : "Clinic workspace navigation"}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                  <NavigationList
                    items={items}
                    activeHref={activeHref}
                    onNavigate={() => setMobileOpen(false)}
                  />
                  <div className="mt-auto flex flex-col gap-3">
                    <UserSummary user={user} />
                    <LogoutButton />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 px-page py-6 outline-none lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
