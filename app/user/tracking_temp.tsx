import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Booking, GeoLocation } from "../../lib/driverTypes";
import { db } from "../../services/firebase";

export default function Tracking() {

const router = useRouter();
const params = useLocalSearchParams();
const bookingId = params.bookingId as string;

const [booking, setBooking] = useState<Booking | null>(null);
const [driverLocation, setDriverLocation] = useState<GeoLocation | null>(null);
const [loading, setLoading] = useState(true);
const [mapRegion, setMapRegion] = useState({
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
});

// Show empty state if no booking ID
if (!bookingId) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyIcon}>📍</Text>
      <Text style={styles.emptyTitle}>No Active Booking</Text>
      <Text style={styles.emptyText}>You don't have any active bookings to track.</Text>
      <TouchableOpacity 
        style={styles.backBtn}
        onPress={() => router.back()}
      >
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

useEffect(() => {
  if (!bookingId) {
    setLoading(false);
    return;
  }

  setLoading(true);
  const bookingRef = doc(db, "bookings", bookingId);
  const unsubBooking = onSnapshot(bookingRef, (snap) => {
    const data = snap.data();
    if (data) {
      const bookingData: Booking = { id: snap.id, ...data } as Booking;
      setBooking(bookingData);
      setLoading(false);

      // Update map region to pickup location
      if (bookingData.pickupLocation) {
        setMapRegion({
          latitude: bookingData.pickupLocation.latitude,
          longitude: bookingData.pickupLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }

      if (data.driverId) {
        // Subscribe to driver location
        const driverRef = doc(db, "drivers", data.driverId);
        const unsubDriver = onSnapshot(driverRef, (driverSnap) => {
          const driverData = driverSnap.data();
          if (driverData && driverData.location) {
            setDriverLocation(driverData.location);
          }
        });

        return () => unsubDriver();
      }
    } else {
      setBooking(null);
      setLoading(false);
    }
  });

  return () => unsubBooking();
}, [bookingId]);

if (loading) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#e53935"/>
      <Text style={styles.loading}>Looking for nearby ambulances...</Text>
    </View>
  );
}

if (!booking) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyIcon}>📍</Text>
      <Text style={styles.emptyTitle}>Booking Not Found</Text>
      <Text style={styles.emptyText}>The booking you're looking for doesn't exist or has been deleted.</Text>
      <TouchableOpacity 
        style={styles.backBtn}
        onPress={() => router.back()}
      >
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

return (
  <View style={styles.container}>
    <Text style={styles.header}>🚑 Ambulance Tracking</Text>

    {/* Map */}
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        region={mapRegion}
      >
        {/* Pickup Location */}
        <Marker
          coordinate={booking.pickupLocation}
          title="Pickup Location"
          description={booking.patientName}
          pinColor="red"
        />

        {/* Driver Location */}
        {driverLocation && booking.status !== "searching" && (
          <Marker
            coordinate={driverLocation}
            title="Ambulance"
            description="Your ambulance"
            pinColor="blue"
          />
        )}

        {/* Route Polyline if available */}
        {booking.status === "in-progress" && driverLocation && (
          <Polyline
            coordinates={[driverLocation, booking.pickupLocation]}
            strokeColor="#000"
            strokeWidth={3}
          />
        )}
      </MapView>
    </View>

    {/* Status Card */}
    <View style={styles.card}>
      {booking.status === "searching" && (
        <>
          <Text style={styles.waiting}>Searching for nearby ambulances...</Text>
          <Text style={styles.patient}>Patient: {booking.patientName}</Text>
          <Text style={styles.emergency}>Emergency: {booking.emergency}</Text>
        </>
      )}

      {booking.status === "accepted" && (
        <>
          <Text style={styles.success}>🚑 Ambulance Assigned!</Text>
          <Text style={styles.patient}>Patient: {booking.patientName}</Text>
          <Text style={styles.emergency}>Emergency: {booking.emergency}</Text>
          <Text style={styles.label}>Driver: {booking.driverName}</Text>
          <Text style={styles.label}>Phone: {booking.driverPhone}</Text>
          {booking.distance && booking.eta && (
            <Text style={styles.eta}>
              Distance: {booking.distance.toFixed(1)} km | ETA: {booking.eta} min
            </Text>
          )}
          <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL(`tel:${booking.driverPhone}`)}>
            <Text style={styles.callText}>Call Driver</Text>
          </TouchableOpacity>
        </>
      )}

      {booking.status === "in-progress" && (
        <>
          <Text style={styles.success}>🚑 Ambulance En Route</Text>
          <Text style={styles.patient}>Patient: {booking.patientName}</Text>
          <Text style={styles.label}>Driver: {booking.driverName}</Text>
          {booking.distance && booking.eta && (
            <Text style={styles.eta}>
              Distance: {booking.distance.toFixed(1)} km | ETA: {booking.eta} min
            </Text>
          )}
        </>
      )}

      {booking.status === "completed" && (
        <Text style={styles.success}>✅ Trip Completed</Text>
      )}
    </View>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
    padding: 20
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#e53935",
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  map: {
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  waiting: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
    color: "#FF9800",
  },
  success: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 15,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  patient: {
    fontSize: 16,
    marginBottom: 5,
  },
  emergency: {
    fontSize: 16,
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  eta: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
    color: "#2196F3",
  },
  callButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  callText: {
    color: "#fff",
    fontWeight: "bold",
  },
  loading: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  error: {
    fontSize: 18,
    color: "#e53935",
  },
  infoBox: {
    padding: 20,
    backgroundColor: "#fff",
  },
  status: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: "#d32f2f",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: "center",
  },
  cancelText: {
    color: "white",
    fontWeight: "bold",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  backBtn: {
    backgroundColor: "#e53935",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

