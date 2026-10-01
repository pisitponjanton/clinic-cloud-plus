"use client";

import type { Appointment } from "@/src/types/private-data";
import {
  LOCAL_DATA_STORAGE_KEY,
  createEmptyLocalDataOverlay,
  mergeAppointments,
  parseLocalDataOverlay,
  serializeLocalDataOverlay,
  type LocalDataOverlay,
  type OverlayIssue,
  type OverlayParseState,
} from "@/src/local-data/appointment-overlay";

export type BrowserStorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type BrowserOverlayReadResult = {
  storageAvailable: boolean;
  state: OverlayParseState | "unavailable";
  overlay: LocalDataOverlay;
  issues: OverlayIssue[];
  storageError: "READ_FAILED" | null;
};

export type BrowserOverlayWriteResult =
  | {
      ok: true;
      overlay: LocalDataOverlay;
    }
  | {
      ok: false;
      error: "STORAGE_UNAVAILABLE" | "WRITE_FAILED";
      overlay: LocalDataOverlay;
    };

export type BrowserOverlayResetResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: "STORAGE_UNAVAILABLE" | "REMOVE_FAILED";
    };

function getBrowserStorage(): BrowserStorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function readBrowserLocalData(
  storage: BrowserStorageLike | null = getBrowserStorage(),
  now: Date = new Date(),
): BrowserOverlayReadResult {
  if (!storage) {
    return {
      storageAvailable: false,
      state: "unavailable",
      overlay: createEmptyLocalDataOverlay(now),
      issues: [],
      storageError: null,
    };
  }

  try {
    const parsed = parseLocalDataOverlay(
      storage.getItem(LOCAL_DATA_STORAGE_KEY),
      now,
    );

    return {
      storageAvailable: true,
      ...parsed,
      storageError: null,
    };
  } catch {
    return {
      storageAvailable: true,
      state: "recovered",
      overlay: createEmptyLocalDataOverlay(now),
      issues: [],
      storageError: "READ_FAILED",
    };
  }
}

export function writeBrowserLocalData(
  overlay: LocalDataOverlay,
  storage: BrowserStorageLike | null = getBrowserStorage(),
  now: Date = new Date(),
): BrowserOverlayWriteResult {
  const nextOverlay: LocalDataOverlay = {
    ...overlay,
    updatedAt: now.toISOString(),
  };

  if (!storage) {
    return {
      ok: false,
      error: "STORAGE_UNAVAILABLE",
      overlay: nextOverlay,
    };
  }

  try {
    storage.setItem(
      LOCAL_DATA_STORAGE_KEY,
      serializeLocalDataOverlay(nextOverlay),
    );

    return {
      ok: true,
      overlay: nextOverlay,
    };
  } catch {
    return {
      ok: false,
      error: "WRITE_FAILED",
      overlay: nextOverlay,
    };
  }
}

export function resetBrowserLocalData(
  storage: BrowserStorageLike | null = getBrowserStorage(),
): BrowserOverlayResetResult {
  if (!storage) {
    return {
      ok: false,
      error: "STORAGE_UNAVAILABLE",
    };
  }

  try {
    storage.removeItem(LOCAL_DATA_STORAGE_KEY);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "REMOVE_FAILED",
    };
  }
}

export function getMergedBrowserAppointments(
  baseAppointments: readonly Appointment[],
  storage: BrowserStorageLike | null = getBrowserStorage(),
  now: Date = new Date(),
): {
  appointments: Appointment[];
  overlayRead: BrowserOverlayReadResult;
} {
  const overlayRead = readBrowserLocalData(storage, now);

  return {
    appointments: mergeAppointments(baseAppointments, overlayRead.overlay),
    overlayRead,
  };
}
