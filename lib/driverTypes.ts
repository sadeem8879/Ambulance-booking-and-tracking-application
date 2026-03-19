// 📁 app/driver/drivertypes.ts

import { Timestamp } from "firebase/firestore";

// ==============================
// DRIVER PROFILE
// ==============================
export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  approved: boolean;
  online: boolean;
  lastOnline?: number;
  vehicleNumber?: string;
  currentTripId?: string;
  location?: GeoLocation;
}

// ==============================
// GEOLOCATION
// ==============================
export interface GeoLocation {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

// ==============================
// BOOKING / REQUEST
// ==============================
export type BookingStatus = 
  | "searching"
  | "accepted"
  | "arrived"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  patientName: string;
  emergency: string;
  phoneNumber: string;
  additionalNotes?: string;
  pickupLocation: GeoLocation;
  dropLocation?: GeoLocation;
  destinationLocation?: GeoLocation;
  destinationAddress?: string;
  status: BookingStatus;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  distance?: number; // km (driver to patient)
  distanceKm?: number; // km (pickup to destination)
  eta?: number; // minutes
  estimatedFare?: number; // fare amount
  tripId?: string;
  otp?: string;
  requestedAt: Timestamp; // timestamp
  arrivedAt?: number;
  startedAt?: number;
  otpVerifiedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  cancelledBy?: string;
}

// ==============================
// DRIVER TRIP
// ==============================
export interface Trip {
  id: string;
  bookingId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  userId?: string;
  userPhone?: string;
  patientName: string;
  pickupLocation: GeoLocation;
  dropLocation?: GeoLocation;
  destinationLocation?: GeoLocation;
  destinationAddress?: string;
  status: "accepted" | "arrived" | "in-progress" | "completed" | "cancelled";
  otp?: string;
  routePolyline?: GeoLocation[]; // Path of driver
  distance?: number; // km
  distanceKm?: number; // km (pickup to destination)
  estimatedFare?: number; // fare amount
  eta?: number; // minutes
  startedAt?: number;
  completedAt?: number;
}

// ==============================
// DRIVER NOTIFICATIONS
// ==============================
export interface DriverNotification {
  id: string;
  driverId: string;
  title: string;
  message: string;
  type: "request" | "trip-update" | "admin-message" | "emergency";
  read: boolean;
  createdAt: number;
}

// ==============================
// DRIVER DASHBOARD STATE
// ==============================
export interface DriverDashboardState {
  driver: Driver | null;
  online: boolean;
  currentTrip: Trip | null;
  activeBookings: Booking[];
  notifications: DriverNotification[];
  location: GeoLocation | null;
  etaToNextPickup?: number;
  distanceToNextPickup?: number;
}