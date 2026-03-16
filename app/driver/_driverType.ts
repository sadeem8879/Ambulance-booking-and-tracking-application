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
  status: BookingStatus;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  distance?: number; // km
  eta?: number; // minutes
  requestedAt: Timestamp; // timestamp
  startedAt?: number;
  completedAt?: number;
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
  status: "accepted" | "in-progress" | "completed" | "cancelled";
  routePolyline?: GeoLocation[]; // Path of driver
  distance?: number; // km
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