// ==============================
// LOCATION AND DISTANCE SERVICE
// ==============================
// Centralized service for location, address, and distance calculations
// Supports geocoding, reverse geocoding, and distance calculations

import * as Location from "expo-location";
import { GeoLocation } from "./driverTypes";

// ==============================
// HAVERSINE DISTANCE CALCULATION
// ==============================
/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lon1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lon2 - Longitude of point 2
 * @returns Distance in kilometers
 */
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Return distance rounded to 2 decimals
  return Math.round(distance * 100) / 100;
};

// ==============================
// CALCULATE DISTANCE BETWEEN LOCATIONS
// ==============================
export const calculateDistance = (
  location1: GeoLocation,
  location2: GeoLocation
): number => {
  return calculateHaversineDistance(
    location1.latitude,
    location1.longitude,
    location2.latitude,
    location2.longitude
  );
};

// ==============================
// REQUEST LOCATION PERMISSIONS
// ==============================
export const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Location permission denied");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Permission request error:", error);
    return false;
  }
};

// ==============================
// GET CURRENT LOCATION
// ==============================
export const getCurrentLocation = async (): Promise<GeoLocation | null> => {
  try {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      console.error("Location permission not granted");
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Get current location error:", error);
    return null;
  }
};

// ==============================
// GEOCODE ADDRESS TO COORDINATES
// ==============================
/**
 * Convert address string to coordinates
 * Uses Expo Location API geocoding
 * @param address - Address string (e.g., "City Hospital, Mumbai")
 * @returns GeoLocation with coordinates or null if not found
 */
export const geocodeAddress = async (
  address: string
): Promise<GeoLocation | null> => {
  try {
    if (!address || address.trim().length === 0) {
      console.error("Empty address provided");
      return null;
    }

    const results = await Location.geocodeAsync(address);

    if (results.length === 0) {
      console.warn(`No location found for address: ${address}`);
      return null;
    }

    const location = results[0];
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// ==============================
// REVERSE GEOCODE COORDINATES TO ADDRESS
// ==============================
/**
 * Convert coordinates to address string
 * @param location - GeoLocation with latitude and longitude
 * @returns Address string or null if not found
 */
export const reverseGeocodeLocation = async (
  location: GeoLocation
): Promise<string | null> => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: location.latitude,
      longitude: location.longitude,
    });

    if (results.length === 0) {
      console.warn("No address found for coordinates");
      return null;
    }

    const result = results[0];
    // Build address string from components
    const addressParts = [
      result.name,
      result.street,
      result.city,
      result.region,
      result.postalCode,
    ].filter(Boolean);

    return addressParts.join(", ");
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
};

// ==============================
// VALIDATE LOCATION
// ==============================
export const validateLocation = (location: GeoLocation | null): boolean => {
  if (!location) return false;
  if (
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  )
    return false;
  if (location.latitude < -90 || location.latitude > 90) return false;
  if (location.longitude < -180 || location.longitude > 180) return false;
  return true;
};

// ==============================
// VALIDATE DISTANCE
// ==============================
export const validateDistance = (
  distance: number | null | undefined
): { valid: boolean; error?: string } => {
  if (!distance || distance < 0) {
    return { valid: false, error: "Invalid distance" };
  }

  if (distance > 500) {
    return { valid: false, error: "Distance exceeds 500km limit" };
  }

  if (distance < 0.5) {
    return { valid: false, error: "Distance too short (minimum 0.5km)" };
  }

  return { valid: true };
};

// ==============================
// ESTIMATE TRAVEL TIME (rough estimate)
// ==============================
/**
 * Rough estimate of travel time based on distance
 * Assumes average speed of 30 km/h in cities
 * @param distanceKm - Distance in kilometers
 * @returns Estimated travel time in minutes
 */
export const estimateTravelTime = (distanceKm: number): number => {
  if (!distanceKm || distanceKm <= 0) return 5; // Minimum 5 minutes

  const avgSpeedKmPerHour = 30; // City average
  const timeInHours = distanceKm / avgSpeedKmPerHour;
  const timeInMinutes = timeInHours * 60;

  // Round to nearest 5 minutes
  return Math.max(5, Math.ceil(timeInMinutes / 5) * 5);
};

// ==============================
// GET ETA IN MINUTES
// ==============================
export const getETA = (distanceKm: number): number => {
  return estimateTravelTime(distanceKm);
};

// ==============================
// FORMAT LOCATION FOR DISPLAY
// ==============================
export const formatLocationDisplay = (location: GeoLocation): string => {
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
};

// ==============================
// GET LOCATION FROM LATITUDE/LONGITUDE
// ==============================
export const getLocationCoordinates = (
  latitude: number,
  longitude: number
): GeoLocation => ({
  latitude,
  longitude,
  timestamp: Date.now(),
});

// ==============================
// CALCULATE BOUNDING BOX (for map fitting)
// ==============================
export const calculateBoundingBox = (
  locations: GeoLocation[]
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} | null => {
  if (!locations || locations.length === 0) return null;

  let minLat = locations[0].latitude;
  let maxLat = locations[0].latitude;
  let minLon = locations[0].longitude;
  let maxLon = locations[0].longitude;

  for (const location of locations) {
    minLat = Math.min(minLat, location.latitude);
    maxLat = Math.max(maxLat, location.latitude);
    minLon = Math.min(minLon, location.longitude);
    maxLon = Math.max(maxLon, location.longitude);
  }

  return { minLat, maxLat, minLon, maxLon };
};

// ==============================
// CALCULATE MIDPOINT BETWEEN TWO LOCATIONS
// ==============================
export const calculateMidpoint = (
  location1: GeoLocation,
  location2: GeoLocation
): GeoLocation => {
  const midLat = (location1.latitude + location2.latitude) / 2;
  const midLon = (location1.longitude + location2.longitude) / 2;

  return {
    latitude: midLat,
    longitude: midLon,
    timestamp: Date.now(),
  };
};

// ==============================
// GET INITIAL MAP REGION
// ==============================
export const getInitialMapRegion = (
  location: GeoLocation | null,
  fallbackLat: number = 28.7041,
  fallbackLon: number = 77.1025 // Default to Delhi
) => {
  if (!location) {
    return {
      latitude: fallbackLat,
      longitude: fallbackLon,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };
};

// ==============================
// DETERMINE LOCATION NAME
// ==============================
export const getLocationName = async (
  location: GeoLocation
): Promise<string> => {
  try {
    const address = await reverseGeocodeLocation(location);
    return address || formatLocationDisplay(location);
  } catch (error) {
    console.error("Error getting location name:", error);
    return formatLocationDisplay(location);
  }
};
