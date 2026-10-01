import type { UserRole } from "@/src/types/private-data";

export type AppNavIcon =
  | "dashboard"
  | "patients"
  | "appointments"
  | "queue"
  | "settings"
  | "demo-settings"
  | "profile"
  | "history";

export type AppNavItem = {
  label: string;
  href: string;
  icon: AppNavIcon;
};

const INTERNAL_NAV: readonly AppNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Patients", href: "/patients", icon: "patients" },
  { label: "Appointments", href: "/appointments", icon: "appointments" },
  { label: "Queue", href: "/queue", icon: "queue" },
];

const OWNER_NAV: readonly AppNavItem[] = [
  ...INTERNAL_NAV,
  { label: "Settings", href: "/settings", icon: "settings" },
  {
    label: "Demo Settings",
    href: "/settings/demo",
    icon: "demo-settings",
  },
];

const PATIENT_NAV: readonly AppNavItem[] = [
  { label: "My Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "My Profile", href: "/me/profile", icon: "profile" },
  {
    label: "My Appointments",
    href: "/me/appointments",
    icon: "appointments",
  },
  { label: "My Queue", href: "/me/queue", icon: "queue" },
  { label: "My History", href: "/me/history", icon: "history" },
];

export function getNavigationItems(role: UserRole): AppNavItem[] {
  if (role === "PATIENT") {
    return PATIENT_NAV.map((item) => ({ ...item }));
  }

  if (role === "OWNER") {
    return OWNER_NAV.map((item) => ({ ...item }));
  }

  return INTERNAL_NAV.map((item) => ({ ...item }));
}

function pathMatches(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

export function getActiveNavigationHref(
  pathname: string,
  items: readonly AppNavItem[],
): string | null {
  return (
    items
      .filter((item) => pathMatches(pathname, item.href))
      .sort((left, right) => right.href.length - left.href.length)[0]?.href ??
    null
  );
}
