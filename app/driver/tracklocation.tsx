// ?? app/driver/tracklocation.tsx
// GPS Tracking Service for Drivers

import * as Location from "expo-location";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { GeoLocation } from "../../lib/driverTypes";
import { db } from "../../services/firebase";

// Conditionally import react-native-maps only on native platforms
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.MapView;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
}

import { useLocalSearchParams } from "expo-router";

let locationSubscription: Location.LocationSubscription | null = null;
let currentTripId: string | null = null;
let currentBookingId: string | null = null;

type LocationType = {
  latitude: number;
  longitude: number;
};

// ==============================
// REQUEST LOCATION PERMISSIONS
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
// START DRIVER TRACKING
// ==============================
export const startDriverTracking = async (driverId: string): Promise<void> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    // Start watching position
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Or every 10 meters
      },
      async (location) => {
        const geoLocation: GeoLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
        };

        // Update Firestore with driver location
        await updateDoc(doc(db, "drivers", driverId), {
          location: geoLocation,
          lastLocationUpdate: Date.now(),
        });

        // Also update current trip (and related booking) if exists
      const driverSnap = await getDoc(doc(db, "drivers", driverId));
      const driverData = driverSnap.data();

      if (driverData?.currentTripId) {
        // Cache current trip + booking for faster updates
        if (currentTripId !== driverData.currentTripId) {
          currentTripId = driverData.currentTripId;
          currentBookingId = null; // reset booking until we load it
        }

        const tripRef = doc(db, "trips", driverData.currentTripId);
        await updateDoc(tripRef, {
          driverLocation: geoLocation,
          lastLocationUpdate: Date.now(),
        });

        // Keep booking in sync so users see live updates
        if (!currentBookingId) {
          const tripSnap = await getDoc(tripRef);
          const tripData = tripSnap.data();
          currentBookingId = tripData?.bookingId ?? null;
        }

        if (currentBookingId) {
          await updateDoc(doc(db, "bookings", currentBookingId), {
            driverLocation: geoLocation,
            lastLocationUpdate: Date.now(),
          });
        }
      }

        console.log("Driver location updated:", geoLocation);
      }
    );

    console.log("Driver tracking started");
  } catch (error) {
    console.error("Start tracking error:", error);
  }
};

// ==============================
// STOP DRIVER TRACKING
// ==============================
export const stopDriverTracking = (): void => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    currentTripId = null;
    currentBookingId = null;
    console.log("Driver tracking stopped");
  }
};

// ==============================
// GET CURRENT LOCATION (One-time)
// ==============================
export const getCurrentLocation = async (): Promise<GeoLocation | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

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
// TRACKING COMPONENT
// ==============================
export default function Tracking() {
  const params = useLocalSearchParams();
  const bookingId = (params.id ?? params.bookingId) as string | undefined;
  const mapRef = useRef<any>(null);

  const [driverLocation, setDriverLocation] = useState<LocationType | null>(null);
  const [userLocation, setUserLocation] = useState<LocationType | null>(null);
  const [status, setStatus] = useState<string>("Searching ambulance...");
  const [distance, setDistance] = useState<number>(0);
  const [eta, setEta] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // ==============================
  // DISTANCE & ETA CALCULATION
  // ==============================
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // km
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

  // ==============================
  // FIRESTORE LISTENER
  // ==============================
  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      setStatus("Booking not found");
      return;
    }

    const bookingRef = doc(db, "bookings", String(bookingId));
    const unsubscribe = onSnapshot(bookingRef, (snapshot) => {
      const data: any = snapshot.data();
      if (!data) {
        setLoading(false);
        setStatus("Booking not found");
        return;
      }

      // USER LOCATION (from pickupLocation in booking, fallback to latitude/longitude)
      const bookingUserLocation = data.pickupLocation?.latitude && data.pickupLocation?.longitude
        ? { latitude: data.pickupLocation.latitude, longitude: data.pickupLocation.longitude }
        : data.latitude && data.longitude
        ? { latitude: data.latitude, longitude: data.longitude }
        : null;

      if (bookingUserLocation) {
        setUserLocation(bookingUserLocation);
      }

      // DRIVER LOCATION
      if (data.driverLocation) {
        setDriverLocation({
          latitude: data.driverLocation.latitude,
          longitude: data.driverLocation.longitude,
        });
      }

      // STATUS
      if (data.status) setStatus(data.status);

      // DISTANCE & ETA (use resolved user location if available)
      if (data.driverLocation && bookingUserLocation) {
        const dist = calculateDistance(
          data.driverLocation.latitude,
          data.driverLocation.longitude,
          bookingUserLocation.latitude,
          bookingUserLocation.longitude
        );
        setDistance(dist);
        const avgSpeed = 40; // km/h average
        const etaMinutes = (dist / avgSpeed) * 60;
        setEta(Math.max(1, Math.round(etaMinutes)));
      }

      // AUTO ZOOM
      if (mapRef.current && data.driverLocation && bookingUserLocation) {
        mapRef.current.fitToCoordinates(
          [
            { latitude: bookingUserLocation.latitude, longitude: bookingUserLocation.longitude },
            data.driverLocation,
          ],
          { edgePadding: { top: 120, right: 120, bottom: 120, left: 120 }, animated: true }
        );
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [bookingId]);

  // ==============================
  // LOADING / ERROR SCREEN
  // ==============================
  const hasLocation = !!userLocation || !!driverLocation;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#e53935" />
        <Text style={{ marginTop: 10 }}>Loading trip details...</Text>
      </View>
    );
  }

  if (!hasLocation) {
    return (
      <View style={styles.loader}>
        <Text style={{ marginTop: 10, textAlign: "center" }}>
          Unable to load trip location. Please go back and try again.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {MapView ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: userLocation?.latitude ?? driverLocation?.latitude ?? 37.78825,
            longitude: userLocation?.longitude ?? driverLocation?.longitude ?? -122.4324,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* USER MARKER */}
          <Marker coordinate={userLocation} title="Your Location" pinColor="blue" />

          {/* DRIVER MARKER */}
          {driverLocation && (
            <Marker coordinate={driverLocation} title="Ambulance" pinColor="red" />
          )}

          {/* ROUTE POLYLINE */}
          {driverLocation && <Polyline coordinates={[driverLocation, userLocation]} strokeWidth={5} strokeColor="#e53935" />}
        </MapView>
      ) : (
        <View style={styles.map}>
          <Text>Map not available on web</Text>
        </View>
      )}

      {/* INFO PANEL */}
      <View style={styles.infoBox}>
        <Text style={styles.title}>?? Ambulance On The Way</Text>
        <Text style={styles.status}>Status: {status}</Text>
        <Text style={styles.info}>?? Distance Remaining: {distance.toFixed(2)} km</Text>
        <Text style={styles.info}>? ETA: {eta} minutes</Text>
      </View>
    </SafeAreaView>
  );
}

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  infoBox: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#e53935",
    marginBottom: 10,
  },
  status: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 6,
  },
  info: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
