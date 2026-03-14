import {
    ActivityIndicator,
    Alert,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase";

export default function BookingDetails() {
  const { id } = useLocalSearchParams();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ==============================
  // FETCH BOOKING DETAILS
  // ==============================
  const fetchBooking = async () => {
    try {
      if (!id) return;

      const ref = doc(db, "bookings", String(id));
      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        setBooking({ id: snapshot.id, ...snapshot.data() });
      }
    } catch (e) {
      console.log("Fetch booking error:", e);
    }
    setLoading(false);
  };

  // ==============================
  // ACCEPT BOOKING
  // ==============================
  const acceptBooking = async () => {
    try {
      if (!booking) return;

      await updateDoc(doc(db, "bookings", booking.id), {
        status: "accepted",
        driverId: auth.currentUser?.uid,
        assignedAt: Date.now()
      });

      Alert.alert("Success", "Booking Accepted");
      fetchBooking();
    } catch (e) {
      console.log("Accept booking error:", e);
    }
  };

  // ==============================
  // START RIDE
  // ==============================
  const startRide = async () => {
    if (!booking) return;

    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "on_the_way",
        startedAt: Date.now()
      });

      Alert.alert("Ride Started", "Navigate to patient location");
      fetchBooking();
    } catch (e) {
      console.log("Start ride error:", e);
    }
  };

  // ==============================
  // COMPLETE RIDE
  // ==============================
  const completeRide = async () => {
    if (!booking) return;

    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "completed",
        completedAt: Date.now()
      });

      Alert.alert("Ride Completed", "Thank you!");
      router.replace("/driver/dashboard");
    } catch (e) {
      console.log("Complete ride error:", e);
    }
  };

  // ==============================
  // CALL PATIENT
  // ==============================
  const callPatient = () => {
    if (!booking?.phoneNumber) {
      Alert.alert("No phone number");
      return;
    }
    Linking.openURL(`tel:${booking.phoneNumber}`);
  };

  // ==============================
  // OPEN MAP
  // ==============================
  const openMap = () => {
    if (!booking?.pickupLocation) {
      Alert.alert("Location not available");
      return;
    }
    const { latitude, longitude } = booking.pickupLocation;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  useEffect(() => {
    fetchBooking();
  }, []);

  // ==============================
  // LOADING SCREEN
  // ==============================
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#e53935" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loader}>
        <Text>No booking found</Text>
      </View>
    );
  }

  // ==============================
  // MAIN UI
  // ==============================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={styles.header}>🚑 Booking Details</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Patient Name</Text>
          <Text style={styles.value}>{booking.patientName}</Text>

          <Text style={styles.label}>Emergency Type</Text>
          <Text style={styles.value}>{booking.emergency}</Text>

          <Text style={styles.label}>Phone Number</Text>
          <Text style={styles.value}>{booking.phoneNumber || "N/A"}</Text>

          <Text style={styles.label}>Additional Notes</Text>
          <Text style={styles.value}>{booking.additionalNotes || "N/A"}</Text>

          <Text style={styles.label}>Pickup Location</Text>
          <Text style={styles.value}>
            {booking.pickupLocation 
              ? `Lat: ${booking.pickupLocation.latitude.toFixed(4)}, Lon: ${booking.pickupLocation.longitude.toFixed(4)}`
              : "N/A"
            }
          </Text>

          <Text style={styles.label}>Status</Text>
          <Text style={styles.status}>{booking.status}</Text>
        </View>

        <View style={styles.actions}>
          {/* Call */}
          <TouchableOpacity style={styles.callBtn} onPress={callPatient}>
            <Text style={styles.btnText}>📞 Call Patient</Text>
          </TouchableOpacity>

          {/* Map */}
          <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
            <Text style={styles.btnText}>📍 Open Map</Text>
          </TouchableOpacity>

          {/* Accept */}
          {booking.status === "pending" && (
            <TouchableOpacity style={styles.acceptBtn} onPress={acceptBooking}>
              <Text style={styles.btnText}>Accept Request</Text>
            </TouchableOpacity>
          )}

          {/* Start Ride */}
          {booking.status === "accepted" && (
            <TouchableOpacity style={styles.startBtn} onPress={startRide}>
              <Text style={styles.btnText}>Start Ride</Text>
            </TouchableOpacity>
          )}

          {/* Complete Ride */}
          {booking.status === "on_the_way" && (
            <TouchableOpacity style={styles.completeBtn} onPress={completeRide}>
              <Text style={styles.btnText}>Complete Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa", padding: 20 },
  header: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 25, color: "#e53935" },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 5 },
  label: { fontSize: 14, color: "#777", marginTop: 10 },
  value: { fontSize: 18, fontWeight: "bold", marginTop: 2 },
  status: { fontSize: 16, marginTop: 5, color: "#e53935", fontWeight: "bold" },
  actions: { gap: 15 },
  callBtn: { backgroundColor: "#4CAF50", padding: 15, borderRadius: 10, alignItems: "center" },
  mapBtn: { backgroundColor: "#FF9800", padding: 15, borderRadius: 10, alignItems: "center" },
  acceptBtn: { backgroundColor: "#2196F3", padding: 15, borderRadius: 10, alignItems: "center" },
  startBtn: { backgroundColor: "#9C27B0", padding: 15, borderRadius: 10, alignItems: "center" },
  completeBtn: { backgroundColor: "#e53935", padding: 15, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" }
});