import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { db } from "./services/_firebase";

export default function TrackingScreen() {

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

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  map: {
    flex: 1,
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

});
