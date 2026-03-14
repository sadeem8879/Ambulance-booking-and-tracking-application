// 📁 app/driver/driverservice.ts

import { addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../../services/firebase";
import { Booking, DriverNotification, GeoLocation } from "./driverType";
import { startDriverTracking, stopDriverTracking } from "./tracklocation";

// ==============================
// GO ONLINE
// ==============================
export const goOnline = async (driverId: string): Promise<void> => {
  try {
    // Update Firestore status
    await updateDoc(doc(db, "drivers", driverId), {
      online: true,
      lastOnline: Date.now(),
    });

    // Start GPS tracking
    await startDriverTracking(driverId);

    console.log("Driver is now ONLINE");
  } catch (err) {
    console.log("Go online error:", err);
  }
};

// ==============================
// GO OFFLINE
// ==============================
export const goOffline = async (driverId: string): Promise<void> => {
  try {
    // Update Firestore status
    await updateDoc(doc(db, "drivers", driverId), {
      online: false,
      lastOnline: Date.now(),
      currentTripId: null,
    });

    // Stop GPS tracking
    stopDriverTracking();

    console.log("Driver is now OFFLINE");
  } catch (err) {
    console.log("Go offline error:", err);
  }
};

// ==============================
// GET NEARBY BOOKINGS (Realtime)
// ==============================
export const subscribeNearbyBookings = (
  callback: (bookings: Booking[]) => void
) => {
  const q = query(
    collection(db, "bookings"),
    where("status", "==", "searching")
  );

  const unsubscribe = onSnapshot(q, (snap) => {
    const bookings: Booking[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Booking[];

    callback(bookings);
  });

  return unsubscribe;
};

// ==============================
// ACCEPT BOOKING
// ==============================
export const acceptBooking = async (driverId: string, booking: Booking) => {
  try {
    await updateDoc(doc(db, "bookings", booking.id), {
      status: "accepted",
      driverId: driverId,
      driverName: "Driver", // Fetch dynamically if needed
      driverPhone: auth.currentUser?.phoneNumber || "N/A",
    });

    // Optionally create a trip
    const tripRef = await addDoc(collection(db, "trips"), {
      bookingId: booking.id,
      driverId,
      driverName: "Driver",
      driverPhone: auth.currentUser?.phoneNumber || "N/A",
      patientName: booking.patientName,
      pickupLocation: booking.pickupLocation,
      status: "accepted",
      startedAt: null,
      completedAt: null,
      routePolyline: [],
    });

    // Update driver with currentTripId
    await updateDoc(doc(db, "drivers", driverId), {
      currentTripId: tripRef.id,
    });

    console.log("Booking accepted & trip created:", tripRef.id);
  } catch (err) {
    console.log("Accept booking error:", err);
  }
};

// ==============================
// START TRIP
// ==============================
export const startTrip = async (driverId: string, tripId: string) => {
  try {
    await updateDoc(doc(db, "trips", tripId), {
      status: "in-progress",
      startedAt: Date.now(),
    });

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
    await updateDoc(doc(db, "trips", tripId), {
      status: "completed",
      completedAt: Date.now(),
    });

    // Remove currentTripId from driver
    await updateDoc(doc(db, "drivers", driverId), {
      currentTripId: null,
    });

    console.log("Trip completed:", tripId);
  } catch (err) {
    console.log("Complete trip error:", err);
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
// AUTO ACCEPT NEAREST REQUEST (Optional)
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
  if (snap.empty) return;

  const bookingDoc = snap.docs[0]; // Take the first available booking (not truly nearest)
  const booking = {
    id: bookingDoc.id,
    ...bookingDoc.data(),
  } as Booking;

  // Accept booking automatically
  await acceptBooking(driverId, booking);
  console.log("Auto-accepted nearest booking:", booking.id);
};