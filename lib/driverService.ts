// 📁 app/driver/driverservice.ts

import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { startDriverTracking, stopDriverTracking } from "../app/driver/tracklocation";
import { auth, db } from "../services/firebase";
import { Booking, DriverNotification, GeoLocation, Trip } from "./driverTypes";

// ==============================
// GO ONLINE
// ==============================
export const goOnline = async (driverId: string): Promise<void> => {
  try {
    const driverRef = doc(db, "drivers", driverId);
    const driverSnap = await getDoc(driverRef);
    const driverData = driverSnap.data();

    // Ensure driver is approved by admin before going online
    if (!driverData?.approved) {
      throw new Error("Driver approval is required to go online.");
    }

    // Update Firestore status
    await updateDoc(driverRef, {
      online: true,
      lastOnline: Date.now(),
    });

    // Start GPS tracking
    await startDriverTracking(driverId);

    console.log("Driver is now ONLINE");
  } catch (err) {
    console.log("Go online error:", err);
    throw err;
  }
};

// ==============================
// GO OFFLINE
// ==============================
export const goOffline = async (driverId: string): Promise<void> => {
  try {
    // ✅ Update ONLY the online status - PRESERVE currentTripId
    // The trip is still active even if the driver is offline
    // Trip data should only be cleared when explicitly completed or cancelled
    await updateDoc(doc(db, "drivers", driverId), {
      online: false,
      lastOnline: Date.now(),
      // DO NOT clear currentTripId here - driver may have an active trip
    });

    // Stop GPS tracking
    stopDriverTracking();

    console.log("Driver is now OFFLINE");
  } catch (err) {
    console.log("Go offline error:", err);
  }
};

// ==============================
// GET NEARBY BOOKINGS (Realtime) - With Distance
// ==============================
export const subscribeNearbyBookings = (
  callback: (bookings: Booking[]) => void,
  driverLocation?: GeoLocation
) => {
  const q = query(
    collection(db, "bookings"),
    where("status", "==", "searching")
  );

  const unsubscribe = onSnapshot(q, (snap) => {
    const bookings: Booking[] = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as Booking)
      .filter((b) =>
        b.pickupLocation &&
        typeof b.pickupLocation.latitude === "number" &&
        typeof b.pickupLocation.longitude === "number"
      );

    // If driver location provided, sort by distance
    if (driverLocation) {
      bookings.sort((a, b) => {
        const distA = calculateDistance(driverLocation, a.pickupLocation);
        const distB = calculateDistance(driverLocation, b.pickupLocation);
        return distA - distB;
      });
    }

    callback(bookings);
  });

  return unsubscribe;
};

// ==============================
// CALCULATE DISTANCE (Haversine)
// ==============================
export const calculateDistance = (loc1: GeoLocation, loc2: GeoLocation): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ==============================
// CHECK IF DRIVER REACHED PICKUP (Within 100m threshold)
// ==============================
export const checkIfReachedPickup = (driverLocation: GeoLocation, pickupLocation: GeoLocation): boolean => {
  const distanceKm = calculateDistance(driverLocation, pickupLocation);
  const distanceMeters = distanceKm * 1000;
  return distanceMeters <= 100; // 100 meters threshold for pickup arrival
};

// ==============================
// GET DISTANCE IN METERS (For validation)
// ==============================
export const getDistanceInMeters = (loc1: GeoLocation, loc2: GeoLocation): number => {
  const distanceKm = calculateDistance(loc1, loc2);
  return distanceKm * 1000;
};

// ==============================
// CHECK IF DRIVER REACHED DESTINATION (Within 50m)
// ==============================
export const checkIfReachedDestination = (driverLocation: GeoLocation, destinationLocation: GeoLocation): boolean => {
  const distanceKm = calculateDistance(driverLocation, destinationLocation);
  const distanceMeters = distanceKm * 1000;
  return distanceMeters <= 50; // 50 meters threshold
};

// ==============================
// AUTO-MARK AS ARRIVED (When within 50m)
// ==============================
export const autoMarkAsArrived = async (tripId: string, driverLocation: GeoLocation, destinationLocation: GeoLocation | null): Promise<boolean> => {
  try {
    if (!destinationLocation) return false;
    
    const hasReached = checkIfReachedDestination(driverLocation, destinationLocation);
    
    if (hasReached) {
      const tripRef = doc(db, "trips", tripId);
      const tripSnap = await getDoc(tripRef);
      const tripData = tripSnap.data();
      
      // Only auto-mark if not already arrived or in-progress
      if (tripData && tripData.status === "accepted") {
        // Mark as arrived (OTP already generated at acceptance)
        await updateDoc(tripRef, {
          status: "arrived",
          arrivedAt: Date.now(),
        });
        
        // Also update booking
        if (tripData.bookingId) {
          await updateDoc(doc(db, "bookings", tripData.bookingId), {
            status: "arrived",
            arrivedAt: Date.now(),
          });
        }
        
        console.log("✅ Auto-marked as ARRIVED");
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Auto-arrive error:", error);
    return false;
  }
};

// ==============================
// CALCULATE ETA & DISTANCE VIA GOOGLE DIRECTIONS
// ==============================
export const getDirections = async (
  origin: GeoLocation,
  destination: GeoLocation
): Promise<{ distance: number; eta: number; polyline: GeoLocation[] } | null> => {
  try {
    const apiKey = "YOUR_GOOGLE_MAPS_API_KEY"; // Replace with actual API key
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];

      const distance = leg.distance.value / 1000; // km
      const eta = Math.ceil(leg.duration.value / 60); // minutes

      // Decode polyline
      const polyline = decodePolyline(route.overview_polyline.points);

      return { distance, eta, polyline };
    }
  } catch (error) {
    console.error("Directions error:", error);
  }
  return null;
};

// ==============================
// DECODE GOOGLE POLYLINE
// ==============================
const decodePolyline = (encoded: string): GeoLocation[] => {
  const points: GeoLocation[] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }
  return points;
};

// ==============================
// ACCEPT BOOKING
// ==============================
export const acceptBooking = async (
  driverId: string,
  booking: Booking,
  driverLocation?: GeoLocation
) => {
  try {
    // Get driver profile for name and phone
    const driverRef = doc(db, "drivers", driverId);
    const driverSnap = await getDoc(driverRef);
    const driverData = driverSnap.data();
    const driverName = driverData?.name || "Driver";
    const driverPhone = driverData?.phone || auth.currentUser?.phoneNumber || "N/A";

    // Re-use existing booking OTP if provided, otherwise generate once
    const otp = booking.otp || Math.floor(1000 + Math.random() * 9000).toString();

    // Mark booking as accepted and store OTP
    await updateDoc(doc(db, "bookings", booking.id), {
      status: "accepted",
      driverId,
      driverName,
      driverPhone,
      driverLocation: driverLocation || null,
      lastLocationUpdate: Date.now(),
      otp: otp,
    });

    // Create a trip record with OTP
    const tripRef = await addDoc(collection(db, "trips"), {
      bookingId: booking.id,
      driverId,
      driverName,
      driverPhone,
      userId: auth.currentUser?.uid || 'unknown',
      userPhone: booking.phoneNumber || 'N/A',
      patientName: booking.patientName,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation || null,
      status: "accepted",
      startedAt: null,
      completedAt: null,
      routePolyline: [],
      distance: null,
      eta: null,
      driverLocation: driverLocation || null,
      otp: otp, // 🔐 OTP also stored in trip
    });

    // Update booking with tripId
    await updateDoc(doc(db, "bookings", booking.id), {
      tripId: tripRef.id,
    });

    // Set current trip id on driver profile
    await updateDoc(doc(db, "drivers", driverId), {
      currentTripId: tripRef.id,
    });

    // If we have driver location, compute route to pickup
    if (driverLocation) {
      const directions = await getDirections(driverLocation, booking.pickupLocation);
      if (directions) {
        await updateDoc(tripRef, {
          routePolyline: directions.polyline,
          distance: directions.distance,
          eta: directions.eta,
        });

        await updateDoc(doc(db, "bookings", booking.id), {
          distance: directions.distance,
          eta: directions.eta,
        });
      }
    }

    console.log("✅ Booking accepted & OTP generated:", otp);
  } catch (err) {
    console.log("Accept booking error:", err);
    throw err;
  }
};

// ==============================
// START TRIP
// ==============================
export const startTrip = async (driverId: string, tripId: string) => {
  try {
    // Get trip data
    const tripRef = doc(db, "trips", tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) return;

    const trip = { id: tripSnap.id, ...tripSnap.data() } as Trip;

    // Get directions
    const directions = await getDirections(trip.pickupLocation, trip.dropLocation || trip.pickupLocation);
    if (directions) {
      await updateDoc(tripRef, {
        status: "in-progress",
        startedAt: Date.now(),
        routePolyline: directions.polyline,
        distance: directions.distance,
        eta: directions.eta,
      });

      // Update booking
      await updateDoc(doc(db, "bookings", trip.bookingId), {
        status: "in-progress",
        distance: directions.distance,
        eta: directions.eta,
      });
    } else {
      // Fallback without directions
      await updateDoc(tripRef, {
        status: "in-progress",
        startedAt: Date.now(),
      });
      await updateDoc(doc(db, "bookings", trip.bookingId), {
        status: "in-progress",
      });
    }

    console.log("Trip started:", tripId);
  } catch (err) {
    console.log("Start trip error:", err);
  }
};

// ==============================
// COMPLETE TRIP
// ==============================
export const completeTrip = async (driverId: string, tripId: string) => {
  try {
    const tripRef = doc(db, "trips", tripId);
    const tripSnap = await getDoc(tripRef);
    const tripData = tripSnap.data();

    // Guard condition
    if (!tripSnap.exists() || !tripData) {
      throw new Error("Trip not found");
    }

    const bookingId = tripData.bookingId as string | undefined;

    await updateDoc(tripRef, {
      status: "completed",
      completedAt: Date.now(),
    });

    if (bookingId) {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "completed",
        completedAt: Date.now(),
      });
    }

    // Remove currentTripId from driver
    await updateDoc(doc(db, "drivers", driverId), {
      currentTripId: null,
    });

    console.log("Trip completed:", tripId);
  } catch (err) {
    console.log("Complete trip error:", err);
    throw err;
  }
};

// ==============================
// UPDATE ETA & DISTANCE
// ==============================
export const updateBookingETA = async (
  bookingId: string,
  distanceKm: number,
  etaMinutes: number
) => {
  try {
    await updateDoc(doc(db, "bookings", bookingId), {
      distance: distanceKm,
      eta: etaMinutes,
    });
  } catch (err) {
    console.log("Update ETA error:", err);
  }
};

// ==============================
// UPDATE TRIP ETA & DISTANCE
// ==============================
export const updateTripETA = async (
  tripId: string,
  distanceKm: number,
  etaMinutes: number
) => {
  try {
    await updateDoc(doc(db, "trips", tripId), {
      distance: distanceKm,
      eta: etaMinutes,
    });
  } catch (err) {
    console.log("Update trip ETA error:", err);
  }
};

// ==============================
// SEND NOTIFICATION
// ==============================
export const sendDriverNotification = async (
  driverId: string,
  title: string,
  message: string,
  type: DriverNotification["type"]
) => {
  try {
    await addDoc(collection(db, "driverNotifications"), {
      driverId,
      title,
      message,
      type,
      read: false,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.log("Send notification error:", err);
  }
};

// ==============================
// AUTO ACCEPT NEAREST REQUEST
// ==============================
export const autoAcceptNearestBooking = async (
  driverId: string,
  driverLocation: GeoLocation
) => {
  const q = query(
    collection(db, "bookings"),
    where("status", "==", "searching")
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const bookings: Booking[] = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Booking[];

  // Find nearest booking
  let nearestBooking: Booking | null = null;
  let minDistance = Infinity;

  for (const booking of bookings) {
    const distance = calculateDistance(driverLocation, booking.pickupLocation);
    if (distance < minDistance) {
      minDistance = distance;
      nearestBooking = booking;
    }
  }

  if (nearestBooking) {
    await acceptBooking(driverId, nearestBooking);
    console.log("Auto-accepted nearest booking:", nearestBooking.id);
    return nearestBooking;
  }

  return null;
};

// ==============================
// VERIFY OTP AND START TRIP
// ==============================
export const verifyOtpAndStartTrip = async (
  tripId: string,
  bookingId: string,
  otpInput: string
): Promise<void> => {
  try {
    // Get booking to verify OTP
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error("Booking not found");
    }

    const bookingData = bookingSnap.data();
    const correctOTP = bookingData.otp;

    // Verify OTP matches
    if (otpInput !== correctOTP) {
      throw new Error("Invalid OTP. Please try again.");
    }

    // Update booking status to in-progress
    await updateDoc(bookingRef, {
      status: "in-progress",
      otpVerifiedAt: Date.now(),
      startedAt: Date.now(),
    });

    // Update trip status to in-progress
    const tripRef = doc(db, "trips", tripId);
    const tripSnap = await getDoc(tripRef);

    if (tripSnap.exists()) {
      await updateDoc(tripRef, {
        status: "in-progress",
        otpVerifiedAt: Date.now(),
        startedAt: Date.now(),
      });
    }

    console.log("OTP verified and trip started:", tripId);
  } catch (err) {
    console.error("Verify OTP error:", err);
    throw err;
  }
};

// ==============================
// OPEN GOOGLE MAPS NAVIGATION (ENHANCED)
// ==============================
/**
 * Generate Google Maps navigation URL with directions
 * @param origin - Starting point (driver location)
 * @param destination - Destination (pickup or hospital)
 * @returns Google Maps URL for navigation
 */
export const generateGoogleMapsNavigationUrl = (
  origin: GeoLocation,
  destination: GeoLocation
): string => {
  return `https://www.google.com/maps/dir/${origin.latitude},${origin.longitude}/${destination.latitude},${destination.longitude}?travelmode=driving`;
};

/**
 * Generate Google Maps URL for directions between two addresses
 * @param originAddress - Starting address
 * @param destinationAddress - Destination address
 * @returns Google Maps URL with directions
 */
export const generateGoogleMapsDirectionsUrl = (
  originAddress: string,
  destinationAddress: string
): string => {
  const encodedOrigin = encodeURIComponent(originAddress);
  const encodedDest = encodeURIComponent(destinationAddress);
  return `https://www.google.com/maps/dir/${encodedOrigin}/${encodedDest}?travelmode=driving`;
};

/**
 * Check if driver is within safe distance to mark as arrived
 * @param driverLocation - Current driver location
 * @param pickupLocation - Patient pickup location
 * @returns Object with status and distance in meters
 */
export const checkArrivalSafety = (
  driverLocation: GeoLocation,
  pickupLocation: GeoLocation
): { canArrive: boolean; distanceMeters: number; message: string } => {
  const distanceKm = calculateDistance(driverLocation, pickupLocation);
  const distanceMeters = distanceKm * 1000;
  const threshold = 100; // 100 meters

  if (distanceMeters <= threshold) {
    return {
      canArrive: true,
      distanceMeters,
      message: `✅ You're within ${threshold}m. Safe to mark as arrived.`,
    };
  }

  return {
    canArrive: false,
    distanceMeters,
    message: `⚠️ You're ${Math.round(distanceMeters)}m away. Get within ${threshold}m to mark as arrived.`,
  };
};