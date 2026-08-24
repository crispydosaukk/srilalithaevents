export interface DeliveryLocationConfig {
  venueAddress: string;
  venuePostcode: string;
  venueLat: number;
  venueLng: number;
  venuePlaceId?: string;

  // Dynamic Delivery Pricing Rules
  enableDeliveryCalculation: boolean;
  freeDeliveryRadiusMiles: number; // e.g. 10 miles (Free within this radius)
  chargePerMileAfterFree: number;  // e.g. £2.50 / mile beyond free radius
  baseDeliveryFee: number;         // minimum base fee if applicable, e.g. £0 or £15
  maxDeliveryRadiusMiles: number;  // e.g. 60 miles
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryLocationConfig = {
  venueAddress: '',
  venuePostcode: '',
  venueLat: 0,
  venueLng: 0,
  enableDeliveryCalculation: true,
  freeDeliveryRadiusMiles: 10,
  chargePerMileAfterFree: 2.5,
  baseDeliveryFee: 0,
  maxDeliveryRadiusMiles: 60,
};

/**
 * Calculates straight-line distance with a realistic UK driving road factor (~1.2x)
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightMiles = R * c;
  // Road travel correction factor (driving roads are ~1.2x straight-line distance)
  return Math.round(straightMiles * 1.2 * 10) / 10;
}

export interface DeliveryCalculationResult {
  isFree: boolean;
  distanceMiles: number;
  billableMiles: number;
  charge: number;
  breakdownText: string;
  isOutOfRange: boolean;
}

export function calculateDeliveryCharge(
  distanceMiles: number,
  config: DeliveryLocationConfig = DEFAULT_DELIVERY_CONFIG
): DeliveryCalculationResult {
  if (!config.enableDeliveryCalculation || distanceMiles <= 0) {
    return {
      isFree: true,
      distanceMiles: Math.max(0, distanceMiles),
      billableMiles: 0,
      charge: 0,
      breakdownText: 'Free Delivery / No Charge',
      isOutOfRange: false,
    };
  }

  const freeRadius = config.freeDeliveryRadiusMiles || 0;
  const ratePerMile = config.chargePerMileAfterFree || 0;
  const baseFee = config.baseDeliveryFee || 0;
  const maxRadius = config.maxDeliveryRadiusMiles || 60;

  if (distanceMiles <= freeRadius) {
    return {
      isFree: true,
      distanceMiles,
      billableMiles: 0,
      charge: 0,
      breakdownText: `Within free ${freeRadius} miles restaurant delivery radius`,
      isOutOfRange: false,
    };
  }

  const isOutOfRange = maxRadius > 0 && distanceMiles > maxRadius;

  // If location is out of standard service radius (e.g. > 60 miles or international test)
  if (isOutOfRange) {
    return {
      isFree: false,
      distanceMiles,
      billableMiles: 0,
      charge: 0,
      breakdownText: `Location is ${distanceMiles} miles from restaurant (exceeds ${maxRadius}m standard delivery radius). Custom arrangements & delivery quote will be confirmed upon review.`,
      isOutOfRange: true,
    };
  }

  const billableMiles = Math.round((distanceMiles - freeRadius) * 10) / 10;
  const calculatedCharge = Math.round(baseFee + billableMiles * ratePerMile);

  return {
    isFree: false,
    distanceMiles,
    billableMiles,
    charge: calculatedCharge,
    breakdownText: `${billableMiles} miles beyond restaurant's ${freeRadius}m free zone @ £${ratePerMile.toFixed(2)}/mi${baseFee > 0 ? ` + £${baseFee} base fee` : ''}`,
    isOutOfRange: false,
  };
}
