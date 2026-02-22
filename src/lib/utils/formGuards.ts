import type { AddressRequest, PersonRequest } from "@/types/insuretech";
import {
  validateCNP,
  validateCUI,
  validateEmail,
  validatePhoneRO,
  validateVIN,
} from "./validation";
import { ROMANIA_COUNTRY_ID } from "./formatters";

type VehicleLike = {
  vin: string;
  licensePlate: string;
  makeId: number | null;
  model: string;
  year: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  fuelTypeId: number | null;
  activityTypeId: number | null;
  engineCapacity: number | null;
  enginePowerKw?: number | null;
  totalWeight: number | null;
  seats: number | null;
  registrationTypeId: number | null;
};

export function isAddressValid(address: AddressRequest): boolean {
  if (!address.countryId) return false;
  if (!address.streetName?.trim() || !address.streetNumber?.trim()) return false;
  if (!address.postalCode?.trim()) return false;

  const isForeign = address.countryId !== ROMANIA_COUNTRY_ID;
  if (isForeign) {
    return !!address.foreignCountyName?.trim() && !!address.foreignCityName?.trim();
  }
  return !!address.countyId && !!address.cityId;
}

export function isPersonValid(person: PersonRequest): boolean {
  const hasContact =
    !!person.email?.trim() &&
    !!person.phoneNumber?.trim() &&
    validateEmail(person.email) &&
    validatePhoneRO(person.phoneNumber);

  const hasAddress = isAddressValid(person.address);
  if (!hasContact || !hasAddress) return false;

  if (person.legalType === "PF") {
    return (
      !!person.firstName?.trim() &&
      !!person.lastName?.trim() &&
      !!person.idSerial?.trim() &&
      !!person.idNumber?.trim() &&
      validateCNP(String(person.cif || ""))
    );
  }

  return (
    !!person.companyName?.trim() &&
    !!person.registrationNumber?.trim() &&
    validateCUI(String(person.cif || ""))
  );
}

export function isVehicleValid(vehicle: VehicleLike): boolean {
  return (
    validateVIN(vehicle.vin || "") &&
    !!vehicle.licensePlate?.trim() &&
    vehicle.makeId !== null &&
    !!vehicle.model?.trim() &&
    vehicle.year !== null &&
    vehicle.year > 0 &&
    vehicle.categoryId !== null &&
    vehicle.subcategoryId !== null &&
    vehicle.fuelTypeId !== null &&
    vehicle.activityTypeId !== null &&
    vehicle.engineCapacity !== null &&
    vehicle.engineCapacity >= 0 &&
    vehicle.enginePowerKw != null &&
    vehicle.enginePowerKw > 0 &&
    vehicle.totalWeight !== null &&
    vehicle.totalWeight > 0 &&
    vehicle.seats !== null &&
    vehicle.seats > 0 &&
    vehicle.registrationTypeId !== null
  );
}

// ----- RCA flow partial validators -----

/**
 * Validate minimal owner data needed before offer generation (CNP/CUI + email).
 */
export function isMinimalOwnerValid(ownerType: "PF" | "PJ", cnpOrCui: string, email: string): boolean {
  const hasValidId = ownerType === "PF"
    ? validateCNP(cnpOrCui)
    : validateCUI(cnpOrCui);
  return hasValidId && validateEmail(email);
}

/**
 * Validate post-offer policy details (collected after user selects an offer).
 */
export function isPostOfferDetailsPFValid(details: {
  ownerFirstName: string;
  ownerLastName: string;
  idSeries: string;
  idNumber: string;
  address: AddressRequest;
  startDate: string;
}): boolean {
  return (
    !!details.ownerFirstName?.trim() &&
    !!details.ownerLastName?.trim() &&
    !!details.idSeries?.trim() &&
    !!details.idNumber?.trim() &&
    !!details.startDate &&
    isAddressValid(details.address)
  );
}

export function isPostOfferDetailsPJValid(details: {
  companyName: string;
  registrationNumber: string;
  address: AddressRequest;
  startDate: string;
}): boolean {
  return (
    !!details.companyName?.trim() &&
    !!details.registrationNumber?.trim() &&
    !!details.startDate &&
    isAddressValid(details.address)
  );
}

/**
 * Validate additional driver data.
 */
export function isAdditionalDriverValid(driver: {
  firstName: string;
  lastName: string;
  cnp: string;
  idSeries: string;
  idNumber: string;
  driverLicenceDate: string;
}): boolean {
  return (
    !!driver.firstName?.trim() &&
    !!driver.lastName?.trim() &&
    validateCNP(driver.cnp) &&
    !!driver.idSeries?.trim() &&
    !!driver.idNumber?.trim() &&
    !!driver.driverLicenceDate
  );
}
