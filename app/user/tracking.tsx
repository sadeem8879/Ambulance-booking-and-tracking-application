import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
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
import { db } from "../../services/firebase";
import { Booking, GeoLocation } from "../driver/_driverType";

export default function Tracking({ bookingId }: { bookingId: string }) {

const [booking, setBooking] = useState<Booking | null>(null);
const [driverLocation, setDriverLocation] = useState<GeoLocation | null>(null);
const [loading, setLoading] = useState(true);
const [mapRegion, setMapRegion] = useState({
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
});

useEffect(() => {
  if (!bookingId) return;

  const bookingRef = doc(db, "bookings", bookingId);
  const unsubBooking = onSnapshot(bookingRef, (snap) => {
    const data = snap.data();
    if (data) {
      const bookingData: Booking = { id: snap.id, ...data } as Booking;
      setBooking(bookingData);

      // Update map region to pickup location
      setMapRegion({
        latitude: bookingData.pickupLocation.latitude,
        longitude: bookingData.pickupLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

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
    }
    setLoading(false);
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
      <Text style={styles.error}>Booking not found</Text>
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
});

export function TrackingScreen() {

  const params = useLocalSearchParams();
  const router = useRouter();

  const bookingId = params.bookingId as string;

  const [bookingData, setBookingData] = useState<any>(null);

  useEffect(() => {

    if (!bookingId) return;

    const unsubscribe = onSnapshot(
      doc(db, "bookings", bookingId),
      (docSnap) => {
        if (docSnap.exists()) {
          setBookingData(docSnap.data());
        }
      }
    );

    return () => unsubscribe();

  }, [bookingId]);

  if (!bookingData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e53935" />
        <Text>Loading booking...</Text>
      </View>
    );
  }

  const handleCancel = async () => {
    await updateDoc(doc(db, "bookings", bookingId), {
      status: "Cancelled",
    });

    router.replace("/");
  };

  return (
    <View style={styles.container}>

      <MapView
        style={styles.map}
        region={{
          latitude: bookingData.userLat,
          longitude: bookingData.userLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >

        {/* User Marker */}

        <Marker
          coordinate={{
            latitude: bookingData.userLat,
            longitude: bookingData.userLng,
          }}
          title="Patient Location"
          pinColor="blue"
        />

        {/* Ambulance Marker (when driver assigned) */}

        {bookingData.driverLat && (
          <Marker
            coordinate={{
              latitude: bookingData.driverLat,
              longitude: bookingData.driverLng,
            }}
            title="Ambulance"
            pinColor="red"
          />
        )}

      </MapView>

      <View style={styles.infoBox}>

        <Text style={styles.status}>
          Status: {bookingData.status}
        </Text>

        <Text>Patient: {bookingData.patientName}</Text>

        <Text>Emergency: {bookingData.emergency}</Text>

        <Text>Ambulance: {bookingData.ambulanceType}</Text>

        {bookingData.status !== "Cancelled" && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelText}>
              Cancel Booking
            </Text>
          </TouchableOpacity>
        )}

      </View>

    </View>
  );
}
[{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 277,
	"startColumn": 11,
	"endLineNumber": 277,
	"endColumn": 13,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'fontWeight'.",
	"source": "ts",
	"startLineNumber": 278,
	"startColumn": 2,
	"endLineNumber": 278,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 278,
	"startColumn": 12,
	"endLineNumber": 278,
	"endColumn": 13,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 278,
	"startColumn": 13,
	"endLineNumber": 278,
	"endColumn": 19,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'marginBottom'.",
	"source": "ts",
	"startLineNumber": 279,
	"startColumn": 2,
	"endLineNumber": 279,
	"endColumn": 14,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 279,
	"startColumn": 14,
	"endLineNumber": 279,
	"endColumn": 15,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 279,
	"startColumn": 15,
	"endLineNumber": 279,
	"endColumn": 17,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'textAlign'.",
	"source": "ts",
	"startLineNumber": 280,
	"startColumn": 2,
	"endLineNumber": 280,
	"endColumn": 11,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 280,
	"startColumn": 11,
	"endLineNumber": 280,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 281,
	"startColumn": 1,
	"endLineNumber": 281,
	"endColumn": 2,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 281,
	"startColumn": 2,
	"endLineNumber": 281,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 284,
	"startColumn": 7,
	"endLineNumber": 284,
	"endColumn": 8,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'justifyContent'.",
	"source": "ts",
	"startLineNumber": 285,
	"startColumn": 2,
	"endLineNumber": 285,
	"endColumn": 16,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 285,
	"startColumn": 16,
	"endLineNumber": 285,
	"endColumn": 17,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 285,
	"startColumn": 17,
	"endLineNumber": 285,
	"endColumn": 25,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'alignItems'.",
	"source": "ts",
	"startLineNumber": 286,
	"startColumn": 2,
	"endLineNumber": 286,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 286,
	"startColumn": 12,
	"endLineNumber": 286,
	"endColumn": 13,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 287,
	"startColumn": 2,
	"endLineNumber": 287,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 290,
	"startColumn": 12,
	"endLineNumber": 290,
	"endColumn": 14,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'color'.",
	"source": "ts",
	"startLineNumber": 291,
	"startColumn": 2,
	"endLineNumber": 291,
	"endColumn": 7,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 291,
	"startColumn": 7,
	"endLineNumber": 291,
	"endColumn": 8,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 292,
	"startColumn": 2,
	"endLineNumber": 292,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 295,
	"startColumn": 18,
	"endLineNumber": 295,
	"endColumn": 24,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'padding'.",
	"source": "ts",
	"startLineNumber": 296,
	"startColumn": 2,
	"endLineNumber": 296,
	"endColumn": 9,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 296,
	"startColumn": 9,
	"endLineNumber": 296,
	"endColumn": 10,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 296,
	"startColumn": 10,
	"endLineNumber": 296,
	"endColumn": 12,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'borderRadius'.",
	"source": "ts",
	"startLineNumber": 297,
	"startColumn": 2,
	"endLineNumber": 297,
	"endColumn": 14,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 297,
	"startColumn": 14,
	"endLineNumber": 297,
	"endColumn": 15,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 297,
	"startColumn": 15,
	"endLineNumber": 297,
	"endColumn": 17,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'shadowColor'.",
	"source": "ts",
	"startLineNumber": 298,
	"startColumn": 2,
	"endLineNumber": 298,
	"endColumn": 13,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 298,
	"startColumn": 13,
	"endLineNumber": 298,
	"endColumn": 14,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 298,
	"startColumn": 14,
	"endLineNumber": 298,
	"endColumn": 20,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'shadowOpacity'.",
	"source": "ts",
	"startLineNumber": 299,
	"startColumn": 2,
	"endLineNumber": 299,
	"endColumn": 15,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 299,
	"startColumn": 15,
	"endLineNumber": 299,
	"endColumn": 16,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 299,
	"startColumn": 16,
	"endLineNumber": 299,
	"endColumn": 19,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'shadowOffset'.",
	"source": "ts",
	"startLineNumber": 300,
	"startColumn": 2,
	"endLineNumber": 300,
	"endColumn": 14,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 300,
	"startColumn": 14,
	"endLineNumber": 300,
	"endColumn": 15,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 300,
	"startColumn": 22,
	"endLineNumber": 300,
	"endColumn": 23,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'height'.",
	"source": "ts",
	"startLineNumber": 300,
	"startColumn": 24,
	"endLineNumber": 300,
	"endColumn": 30,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 300,
	"startColumn": 30,
	"endLineNumber": 300,
	"endColumn": 31,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 300,
	"startColumn": 33,
	"endLineNumber": 300,
	"endColumn": 34,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 301,
	"startColumn": 15,
	"endLineNumber": 301,
	"endColumn": 16,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'elevation'.",
	"source": "ts",
	"startLineNumber": 302,
	"startColumn": 2,
	"endLineNumber": 302,
	"endColumn": 11,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 302,
	"startColumn": 11,
	"endLineNumber": 302,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 303,
	"startColumn": 2,
	"endLineNumber": 303,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 306,
	"startColumn": 11,
	"endLineNumber": 306,
	"endColumn": 13,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'textAlign'.",
	"source": "ts",
	"startLineNumber": 307,
	"startColumn": 2,
	"endLineNumber": 307,
	"endColumn": 11,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 307,
	"startColumn": 11,
	"endLineNumber": 307,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 307,
	"startColumn": 12,
	"endLineNumber": 307,
	"endColumn": 20,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'color'.",
	"source": "ts",
	"startLineNumber": 308,
	"startColumn": 2,
	"endLineNumber": 308,
	"endColumn": 7,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 308,
	"startColumn": 7,
	"endLineNumber": 308,
	"endColumn": 8,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 309,
	"startColumn": 2,
	"endLineNumber": 309,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 312,
	"startColumn": 11,
	"endLineNumber": 312,
	"endColumn": 13,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'fontWeight'.",
	"source": "ts",
	"startLineNumber": 313,
	"startColumn": 2,
	"endLineNumber": 313,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 313,
	"startColumn": 12,
	"endLineNumber": 313,
	"endColumn": 13,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 313,
	"startColumn": 13,
	"endLineNumber": 313,
	"endColumn": 19,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'color'.",
	"source": "ts",
	"startLineNumber": 314,
	"startColumn": 2,
	"endLineNumber": 314,
	"endColumn": 7,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 314,
	"startColumn": 7,
	"endLineNumber": 314,
	"endColumn": 8,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 314,
	"startColumn": 8,
	"endLineNumber": 314,
	"endColumn": 17,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'marginBottom'.",
	"source": "ts",
	"startLineNumber": 315,
	"startColumn": 2,
	"endLineNumber": 315,
	"endColumn": 14,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 315,
	"startColumn": 14,
	"endLineNumber": 315,
	"endColumn": 15,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 316,
	"startColumn": 2,
	"endLineNumber": 316,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 319,
	"startColumn": 8,
	"endLineNumber": 319,
	"endColumn": 14,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'marginTop'.",
	"source": "ts",
	"startLineNumber": 320,
	"startColumn": 2,
	"endLineNumber": 320,
	"endColumn": 11,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 320,
	"startColumn": 11,
	"endLineNumber": 320,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 321,
	"startColumn": 2,
	"endLineNumber": 321,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 324,
	"startColumn": 11,
	"endLineNumber": 324,
	"endColumn": 13,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'fontWeight'.",
	"source": "ts",
	"startLineNumber": 325,
	"startColumn": 2,
	"endLineNumber": 325,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 325,
	"startColumn": 12,
	"endLineNumber": 325,
	"endColumn": 13,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 326,
	"startColumn": 2,
	"endLineNumber": 326,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 329,
	"startColumn": 12,
	"endLineNumber": 329,
	"endColumn": 14,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'backgroundColor'.",
	"source": "ts",
	"startLineNumber": 330,
	"startColumn": 2,
	"endLineNumber": 330,
	"endColumn": 17,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 330,
	"startColumn": 17,
	"endLineNumber": 330,
	"endColumn": 18,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 330,
	"startColumn": 18,
	"endLineNumber": 330,
	"endColumn": 27,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'padding'.",
	"source": "ts",
	"startLineNumber": 331,
	"startColumn": 2,
	"endLineNumber": 331,
	"endColumn": 9,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 331,
	"startColumn": 9,
	"endLineNumber": 331,
	"endColumn": 10,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 331,
	"startColumn": 10,
	"endLineNumber": 331,
	"endColumn": 12,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'borderRadius'.",
	"source": "ts",
	"startLineNumber": 332,
	"startColumn": 2,
	"endLineNumber": 332,
	"endColumn": 14,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 332,
	"startColumn": 14,
	"endLineNumber": 332,
	"endColumn": 15,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 332,
	"startColumn": 15,
	"endLineNumber": 332,
	"endColumn": 17,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'alignItems'.",
	"source": "ts",
	"startLineNumber": 333,
	"startColumn": 2,
	"endLineNumber": 333,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 333,
	"startColumn": 12,
	"endLineNumber": 333,
	"endColumn": 13,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 334,
	"startColumn": 2,
	"endLineNumber": 334,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2695",
	"severity": 8,
	"message": "Left side of comma operator is unused and has no side effects.",
	"source": "ts",
	"startLineNumber": 337,
	"startColumn": 8,
	"endLineNumber": 337,
	"endColumn": 14,
	"modelVersionId": 21,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'fontWeight'.",
	"source": "ts",
	"startLineNumber": 338,
	"startColumn": 2,
	"endLineNumber": 338,
	"endColumn": 12,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "';' expected.",
	"source": "ts",
	"startLineNumber": 338,
	"startColumn": 12,
	"endLineNumber": 338,
	"endColumn": 13,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 341,
	"startColumn": 1,
	"endLineNumber": 341,
	"endColumn": 2,
	"modelVersionId": 21,
	"origin": "extHost1"
},{
	"resource": "/d:/my-app/app/user/tracking.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 341,
	"startColumn": 2,
	"endLineNumber": 341,
	"endColumn": 3,
	"modelVersionId": 21,
	"origin": "extHost1"
}]