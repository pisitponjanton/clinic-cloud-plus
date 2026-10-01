import type { AuthUser } from "@/src/auth/user";
import {
  getAuthorizedPatients,
  searchAuthorizedPatients,
} from "@/src/authorization/data";
import type { Patient } from "@/src/types/private-data";

export type PatientListItem = {
  id: string;
  hn: string;
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: Patient["gender"];
};

export type PatientListProjection = {
  query: string;
  totalInScope: number;
  resultCount: number;
  items: PatientListItem[];
};

function toListItem(patient: Patient): PatientListItem {
  return {
    id: patient.id,
    hn: patient.hn,
    fullName: `${patient.firstName} ${patient.lastName}`,
    phone: patient.phone,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
  };
}

export function getPatientListProjection(
  user: AuthUser,
  rawQuery: string | undefined,
): PatientListProjection {
  const query = rawQuery?.trim() ?? "";
  const inScope = getAuthorizedPatients(user);
  const results = query
    ? searchAuthorizedPatients(user, query)
    : inScope;

  return {
    query,
    totalInScope: inScope.length,
    resultCount: results.length,
    items: results.map(toListItem),
  };
}
