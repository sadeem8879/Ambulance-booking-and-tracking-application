// ==============================
// FARE CALCULATION SERVICE
// ==============================
// Centralized service for all fare-related calculations
// Supports base fare, distance charge, waiting charge, and emergency surcharge

export interface FareComponents {
  baseFare: number;
  distanceCharge: number;
  waitingCharge: number;
  emergencySurcharge: number;
  totalFare: number;
}

export interface FareConfig {
  baseFare: number;
  pricePerKm: number;
  pricePerMinute: number;
  emergencySurcharge: number;
}

// ==============================
// DEFAULT FARE CONFIGURATION
// ==============================
const DEFAULT_FARE_CONFIG: FareConfig = {
  baseFare: 50, // ₹50
  pricePerKm: 15, // ₹15 per km
  pricePerMinute: 2, // ₹2 per minute waiting
  emergencySurcharge: 100, // ₹100 emergency surcharge
};

// ==============================
// VALIDATE INPUT
// ==============================
export const validateFareInput = (
  distance: number | null | undefined,
  emergencyType?: string
): { valid: boolean; error?: string } => {
  if (!distance || distance < 0) {
    return { valid: false, error: "Invalid distance" };
  }

  if (distance > 500) {
    return { valid: false, error: "Distance exceeds service area (500km)" };
  }

  return { valid: true };
};

// ==============================
// CALCULATE DISTANCE CHARGE
// ==============================
export const calculateDistanceCharge = (
  distanceKm: number,
  config: FareConfig = DEFAULT_FARE_CONFIG
): number => {
  if (!distanceKm || distanceKm < 0) return 0;
  return Math.round(distanceKm * config.pricePerKm * 100) / 100; // Round to 2 decimals
};

// ==============================
// CALCULATE WAITING CHARGE
// ==============================
export const calculateWaitingCharge = (
  waitingMinutes: number = 0,
  config: FareConfig = DEFAULT_FARE_CONFIG
): number => {
  if (!waitingMinutes || waitingMinutes <= 0) return 0;
  return Math.round(waitingMinutes * config.pricePerMinute * 100) / 100;
};

// ==============================
// GET EMERGENCY SURCHARGE
// ==============================
export const getEmergencySurcharge = (
  emergencyType?: string,
  config: FareConfig = DEFAULT_FARE_CONFIG
): number => {
  // List of emergency types that qualify for surcharge
  const criticalEmergencies = [
    "Heart Attack",
    "Stroke",
    "Severe Accident",
    "Multi-Trauma",
    "Unconscious",
  ];

  const isCritical = emergencyType && criticalEmergencies.some(
    (type) => type.toLowerCase() === emergencyType.toLowerCase()
  );

  return isCritical ? config.emergencySurcharge : 0;
};

// ==============================
// CALCULATE COMPLETE FARE
// ==============================
export const calculateCompleteFare = (
  distanceKm: number,
  emergencyType?: string,
  waitingMinutes: number = 0,
  config: FareConfig = DEFAULT_FARE_CONFIG
): FareComponents => {
  // Validate input
  const validation = validateFareInput(distanceKm, emergencyType);
  if (!validation.valid) {
    console.warn("Fare calculation warning:", validation.error);
    // Return minimal fare on error
    return {
      baseFare: config.baseFare,
      distanceCharge: 0,
      waitingCharge: 0,
      emergencySurcharge: 0,
      totalFare: config.baseFare,
    };
  }

  const distanceCharge = calculateDistanceCharge(distanceKm, config);
  const waitingCharge = calculateWaitingCharge(waitingMinutes, config);
  const emergencySurcharge = getEmergencySurcharge(emergencyType, config);

  const totalFare = Math.round(
    (config.baseFare + distanceCharge + waitingCharge + emergencySurcharge) * 100
  ) / 100;

  return {
    baseFare: config.baseFare,
    distanceCharge,
    waitingCharge,
    emergencySurcharge,
    totalFare,
  };
};

// ==============================
// ESTIMATE FARE (Quick calculation without waiting)
// ==============================
export const estimateFare = (
  distanceKm: number,
  emergencyType?: string,
  config: FareConfig = DEFAULT_FARE_CONFIG
): number => {
  const fare = calculateCompleteFare(distanceKm, emergencyType, 0, config);
  return fare.totalFare;
};

// ==============================
// GET FARE SUMMARY (Human-readable)
// ==============================
export const getFareSummary = (
  fareComponents: FareComponents
): string => {
  let summary = `₹${fareComponents.baseFare} (base)`;

  if (fareComponents.distanceCharge > 0) {
    summary += ` + ₹${fareComponents.distanceCharge} (distance)`;
  }

  if (fareComponents.waitingCharge > 0) {
    summary += ` + ₹${fareComponents.waitingCharge} (waiting)`;
  }

  if (fareComponents.emergencySurcharge > 0) {
    summary += ` + ₹${fareComponents.emergencySurcharge} (emergency)`;
  }

  return summary;
};

// ==============================
// APPLY DISCOUNT
// ==============================
export const applyDiscount = (
  totalFare: number,
  discountPercent: number
): number => {
  if (discountPercent < 0 || discountPercent > 100) {
    console.warn("Invalid discount percent");
    return totalFare;
  }

  const discountAmount = (totalFare * discountPercent) / 100;
  return Math.round((totalFare - discountAmount) * 100) / 100;
};

// ==============================
// APPLY PROMO CODE
// ==============================
export const applyPromoCode = (
  totalFare: number,
  promoCode: string
): { success: boolean; finalFare: number; discount: number; message: string } => {
  // Simple promo code logic - expand as needed
  const promoCodeMap: {
    [key: string]: { discountPercent: number; maxDiscount: number };
  } = {
    EMERGENCY10: { discountPercent: 10, maxDiscount: 50 },
    WELCOME15: { discountPercent: 15, maxDiscount: 100 },
    FIRST50: { discountPercent: 25, maxDiscount: 50 },
  };

  const promo = promoCodeMap[promoCode.toUpperCase()];

  if (!promo) {
    return {
      success: false,
      finalFare: totalFare,
      discount: 0,
      message: "Invalid promo code",
    };
  }

  const discount = Math.min(
    (totalFare * promo.discountPercent) / 100,
    promo.maxDiscount
  );
  const finalFare = Math.round((totalFare - discount) * 100) / 100;

  return {
    success: true,
    finalFare,
    discount: Math.round(discount * 100) / 100,
    message: `Promo applied: ₹${Math.round(discount * 100) / 100} discount`,
  };
};

// ==============================
// FORMAT FARE FOR DISPLAY
// ==============================
export const formatFareDisplay = (fare: number): string => {
  return `₹${fare.toFixed(2)}`;
};

// ==============================
// GET FARE BREAKDOWN TEXT
// ==============================
export const getFareBreakdownText = (fareComponents: FareComponents): string => {
  const lines = [
    `Base Fare: ₹${fareComponents.baseFare.toFixed(2)}`,
    fareComponents.distanceCharge > 0
      ? `Distance Charge: ₹${fareComponents.distanceCharge.toFixed(2)}`
      : null,
    fareComponents.waitingCharge > 0
      ? `Waiting Charge: ₹${fareComponents.waitingCharge.toFixed(2)}`
      : null,
    fareComponents.emergencySurcharge > 0
      ? `Emergency Surcharge: ₹${fareComponents.emergencySurcharge.toFixed(2)}`
      : null,
  ].filter((line) => line !== null);

  return lines.join("\n");
};
