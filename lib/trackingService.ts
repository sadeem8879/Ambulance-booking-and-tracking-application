// Location tracking service - separated to avoid circular dependencies
import * as Location from "expo-location";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { GeoLocation } from "./driverTypes";

let locationSubscription: Location.LocationSubscription | null = null;

// ==============================
// UTILITY: DISTANCE CALCULATION (Haversine Formula)
// ==============================
export const calculateDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculateDistanceInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  return calculateDistanceInMeters(lat1, lon1, lat2, lon2) / 1000;
};

// ==============================
// REQUEST LOCATION PERMISSION
// ==============================
export const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    console.log("Location permission denied");
    return false;
  }
  return true;
};

// ==============================
// START REAL-TIME DRIVER TRACKING
// ==============================
export const startDriverTracking = async (driverId: string): Promise<void> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    // Watch driver position with HIGH accuracy
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, // Update every 3 seconds
        distanceInterval: 5, // Or every 5 meters
      },
      async (location) => {
        const geoLocation: GeoLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
        };

        try {
          // Update driver document with latest location
          await updateDoc(doc(db, "drivers", driverId), {
            location: geoLocation,
            lastLocationUpdate: Date.now(),
          });
        } catch (err) {
          console.error("Failed to update driver location:", err);
        }
      }
    );

    console.log("✅ Driver tracking started");
  } catch (error) {
    console.error("❌ Start tracking error:", error);
  }
};

// ==============================
// STOP DRIVER TRACKING
// ==============================
export const stopDriverTracking = (): void => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    console.log("✅ Driver tracking stopped");
  }
};

// ==============================
// GET CURRENT LOCATION (One-time)
// ==============================
export type LocationType = {
  latitude: number;
  longitude: number;
};

export const getCurrentLocation = async (): Promise<LocationType | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error("❌ Get current location error:", error);
    return null;
  }
};
