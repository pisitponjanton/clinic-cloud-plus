import clinicJson from "@/src/data/public/clinic.json";
import doctorsJson from "@/src/data/public/doctors.json";
import promotionsJson from "@/src/data/public/promotions.json";
import servicesJson from "@/src/data/public/services.json";

import type {
  Clinic,
  Promotion,
  PublicDoctor,
  Service,
} from "@/src/types/public-data";

const clinic = clinicJson as Clinic;
const doctors = doctorsJson as PublicDoctor[];
const promotions = promotionsJson as Promotion[];
const services = servicesJson as Service[];

function cloneClinic(record: Clinic): Clinic {
  return {
    ...record,
    openingHours: record.openingHours.map((entry) => ({ ...entry })),
  };
}

function cloneDoctor(record: PublicDoctor): PublicDoctor {
  return { ...record };
}

function cloneService(record: Service): Service {
  return { ...record };
}

function clonePromotion(record: Promotion): Promotion {
  return {
    ...record,
    serviceIds: [...record.serviceIds],
  };
}

export function getClinic(): Clinic {
  return cloneClinic(clinic);
}

export function getDoctors(): PublicDoctor[] {
  return doctors.map(cloneDoctor);
}

export function getDoctorById(doctorId: string): PublicDoctor | null {
  const doctor = doctors.find((record) => record.id === doctorId);
  return doctor ? cloneDoctor(doctor) : null;
}

export function getServices(): Service[] {
  return services.map(cloneService);
}

export function getServiceById(serviceId: string): Service | null {
  const service = services.find((record) => record.id === serviceId);
  return service ? cloneService(service) : null;
}

export function searchServices(query: string): Service[] {
  const normalized = query.trim().toLocaleLowerCase();

  if (!normalized) {
    return getServices();
  }

  return services
    .filter((service) =>
      [
        service.id,
        service.name,
        service.description,
      ].some((value) => value.toLocaleLowerCase().includes(normalized)),
    )
    .map(cloneService);
}

export function getPromotions(): Promotion[] {
  return promotions.map(clonePromotion);
}

export function getPromotionById(promotionId: string): Promotion | null {
  const promotion = promotions.find((record) => record.id === promotionId);
  return promotion ? clonePromotion(promotion) : null;
}
