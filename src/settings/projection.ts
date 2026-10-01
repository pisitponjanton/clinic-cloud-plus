import type { AuthUser } from "@/src/auth/user";
import { requireWebCapability } from "@/src/authorization/permissions";
import { getAppointments, getPatients } from "@/src/data-access/private";
import { getClinic } from "@/src/data-access/public";
import { LOCAL_DATA_SCHEMA_VERSION, LOCAL_DATA_STORAGE_KEY } from "@/src/local-data/appointment-overlay";

export type SettingsProjection = {
  clinic: ReturnType<typeof getClinic>;
  basePatients: number;
  baseAppointments: number;
  storageKey: string;
  schemaVersion: number;
};

export function getSettingsProjection(user: AuthUser): SettingsProjection {
  requireWebCapability(user, "VIEW_SETTINGS");

  return {
    clinic: getClinic(),
    basePatients: getPatients().length,
    baseAppointments: getAppointments().length,
    storageKey: LOCAL_DATA_STORAGE_KEY,
    schemaVersion: LOCAL_DATA_SCHEMA_VERSION,
  };
}

export function assertCanResetDemo(user: AuthUser): void {
  requireWebCapability(user, "DEMO_RESET");
}
