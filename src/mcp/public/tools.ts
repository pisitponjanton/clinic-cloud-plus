import {
  getClinic,
  getDoctors,
  getPromotions,
  getServiceById,
  getServices,
  searchServices,
} from "@/src/data-access/public";
import {
  type OpeningHoursEntry,
  type Promotion,
  type PublicDoctor,
  type Service,
  type Weekday,
} from "@/src/types/public-data";

export type PublicMcpSuccess<T> = {
  ok: true;
  data: T;
  source: "base-json";
};

export type PublicMcpNotFound = {
  ok: false;
  error: {
    code: "NOT_FOUND";
    message: "Record not found in the mock dataset.";
  };
};

export type PublicMcpResult<T> = PublicMcpSuccess<T> | PublicMcpNotFound;

export type PublicClinicInfo = {
  id: string;
  name: string;
  description: string;
  phone: string;
  address: string;
};

export type PublicOpeningHoursData = {
  requestedDay: Weekday | null;
  hours: OpeningHoursEntry[];
};

export type PublicPromotionStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "UPCOMING"
  | "EXPIRED";

export type PublicPromotion = Promotion & {
  status: PublicPromotionStatus;
};

function success<T>(data: T): PublicMcpSuccess<T> {
  return {
    ok: true,
    data,
    source: "base-json",
  };
}

function notFound(): PublicMcpNotFound {
  return {
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "Record not found in the mock dataset.",
    },
  };
}

function cloneDoctorPublic(record: PublicDoctor): PublicDoctor {
  return {
    id: record.id,
    clinicId: record.clinicId,
    displayName: record.displayName,
    specialty: record.specialty,
    publicBio: record.publicBio,
    active: record.active,
  };
}

function promotionStatus(
  promotion: Promotion,
  asOfDate: string,
): PublicPromotionStatus {
  if (!promotion.active) {
    return "INACTIVE";
  }

  if (asOfDate < promotion.startDate) {
    return "UPCOMING";
  }

  if (asOfDate > promotion.endDate) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

export function getPublicClinicInfo(): PublicMcpSuccess<PublicClinicInfo> {
  const clinic = getClinic();

  return success({
    id: clinic.id,
    name: clinic.name,
    description: clinic.description,
    phone: clinic.phone,
    address: clinic.address,
  });
}

export function getPublicOpeningHours(
  day?: Weekday,
): PublicMcpSuccess<PublicOpeningHoursData> {
  const hours = getClinic().openingHours;

  return success({
    requestedDay: day ?? null,
    hours: day
      ? hours.filter((entry) => entry.day === day)
      : hours,
  });
}

export function getPublicServices(): PublicMcpSuccess<Service[]> {
  return success(getServices());
}

export function getPublicServiceDetail(
  serviceId: string,
): PublicMcpResult<Service> {
  const service = getServiceById(serviceId.trim());

  return service ? success(service) : notFound();
}

export function searchPublicServices(
  query: string,
): PublicMcpSuccess<Service[]> {
  return success(searchServices(query));
}

export function getPublicPromotions(
  asOfDate = new Date().toISOString().slice(0, 10),
): PublicMcpSuccess<{
  evaluatedOn: string;
  promotions: PublicPromotion[];
}> {
  return success({
    evaluatedOn: asOfDate,
    promotions: getPromotions().map((promotion) => ({
      ...promotion,
      status: promotionStatus(promotion, asOfDate),
    })),
  });
}

export function getPublicDoctors(): PublicMcpSuccess<PublicDoctor[]> {
  return success(getDoctors().map(cloneDoctorPublic));
}

