import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
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
import { acceptBooking } from "../../lib/driverService";
import { auth, db } from "../../services/firebase";

export default function BookingDetails() {
  const { id } = useLocalSearchParams();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState("");

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
  const handleAccept = async () => {
    try {
      if (!booking) return;

      await acceptBooking(auth.currentUser!.uid, booking);
      Alert.alert("Success", "Booking Accepted! Head to patient location.");
      fetchBooking();
    } catch (e) {
      console.log("Accept booking error:", e);
      Alert.alert("Error", "Failed to accept booking");
    }
  };

  // ==============================
  // ARRIVED AT LOCATION (Show OTP)
  // ==============================
  const arrivedAtLocation = async () => {
    if (!booking) return;

    try {
      // Generate 4-digit OTP
      const generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();

      await updateDoc(doc(db, "bookings", booking.id), {
        status: "arrived",
        arrivedAt: Date.now(),
        otp: generatedOTP,
      });

      // If trip exists, update it too
      if (booking.tripId) {
        await updateDoc(doc(db, "trips", booking.tripId), {
          status: "arrived",
          arrivedAt: Date.now(),
          otp: generatedOTP,
        });
      }

      setOtp(generatedOTP);
      setShowOTPModal(true);
      Alert.alert("Success", "You've arrived! OTP generated for patient verification.");
      fetchBooking();
    } catch (e) {
      console.log("Arrived error:", e);
      Alert.alert("Error", "Failed to mark arrival");
    }
  };

  // ==============================
  // START TRIP (After OTP is verified by patient)
  // ==============================
  const startTrip = async () => {
    if (!booking) return;

    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "in-progress",
        startedAt: Date.now()
      });

      // If trip exists, update it too
      if (booking.tripId) {
        await updateDoc(doc(db, "trips", booking.tripId), {
          status: "in-progress",
          startedAt: Date.now()
        });
      }

      setShowOTPModal(false);
      Alert.alert("Trip Started", "Safe journey! Head to hospital.");
      fetchBooking();
    } catch (e) {
      console.log("Start trip error:", e);
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

      // If trip exists, update it too
      if (booking.tripId) {
        await updateDoc(doc(db, "trips", booking.tripId), {
          status: "completed",
          completedAt: Date.now()
        });
      }

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
          {booking.status === "searching" && (
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
              <Text style={styles.btnText}>✅ Accept Request</Text>
            </TouchableOpacity>
          )}

          {/* Arrived at Location */}
          {booking.status === "accepted" && (
            <TouchableOpacity style={styles.arrivedBtn} onPress={arrivedAtLocation}>
              <Text style={styles.btnText}>📍 Arrived at Location</Text>
            </TouchableOpacity>
          )}

          {/* Start Trip (after OTP shown) */}
          {booking.status === "arrived" && (
            <TouchableOpacity style={styles.startBtn} onPress={() => setShowOTPModal(true)}>
              <Text style={styles.btnText}>🚑 Show OTP / Start Trip</Text>
            </TouchableOpacity>
          )}

          {/* Complete Ride */}
          {booking.status === "in-progress" && (
            <TouchableOpacity style={styles.completeBtn} onPress={completeRide}>
              <Text style={styles.btnText}>✅ Complete Ride</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* OTP Modal */}
        <Modal
          visible={showOTPModal && booking.status === "arrived"}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.otpOverlay}>
            <View style={styles.otpCard}>
              <Text style={styles.otpTitle}>📋 OTP for Patient</Text>
              <Text style={styles.otpSubtitle}>Share this OTP with the patient to start the trip</Text>
              
              <View style={styles.otpDisplayBox}>
                <Text style={styles.otpValue}>{otp}</Text>
              </View>

              <Text style={styles.otpInstruction}>
                Patient will enter this OTP in their app to verify pickup
              </Text>

              <TouchableOpacity 
                style={styles.copyOtpBtn} 
                onPress={() => {
                  Alert.alert("OTP Copied", `OTP ${otp} copied to clipboard`);
                }}
              >
                <Text style={styles.btnText}>📋 Copy OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.startTripBtn} 
                onPress={startTrip}
              >
                <Text style={styles.btnText}>✅ Start Trip (After Patient Verifies OTP)</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.otpCloseBtn} 
                onPress={() => setShowOTPModal(false)}
              >
                <Text style={styles.otpCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  arrivedBtn: { backgroundColor: "#FF9800", padding: 15, borderRadius: 10, alignItems: "center" },
  startBtn: { backgroundColor: "#9C27B0", padding: 15, borderRadius: 10, alignItems: "center" },
  completeBtn: { backgroundColor: "#e53935", padding: 15, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // OTP Modal Styles
  otpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  otpCard: {
    backgroundColor: "#fff",
    padding: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },
  otpSubtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    marginBottom: 25,
  },
  otpDisplayBox: {
    backgroundColor: "#f0f0f0",
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#e53935",
  },
  otpValue: {
    fontSize: 48,
    fontWeight: "bold",
    textAlign: "center",
    color: "#e53935",
    letterSpacing: 10,
  },
  otpInstruction: {
    fontSize: 13,
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
    fontStyle: "italic",
  },
  copyOtpBtn: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  startTripBtn: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  otpCloseBtn: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  otpCloseText: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
});