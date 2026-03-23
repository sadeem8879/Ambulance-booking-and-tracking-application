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
      const resolvedOTP = booking.otp || Math.floor(1000 + Math.random() * 9000).toString();

      await updateDoc(doc(db, "bookings", booking.id), {
        status: "arrived",
        arrivedAt: Date.now(),
        otp: resolvedOTP,
      });

      // If trip exists, update it too
      if (booking.tripId) {
        await updateDoc(doc(db, "trips", booking.tripId), {
          status: "arrived",
          arrivedAt: Date.now(),
          otp: resolvedOTP,
        });
      }

      setOtp(resolvedOTP);
      setShowOTPModal(true);
      Alert.alert("Success", "You've arrived! OTP set for patient verification.");
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
      Alert.alert("Trip Started", "Safe journey! Head to hospital.", [
        {
          text: "OK",
          onPress: () => {
            // Navigate to tracking screen to show user location on map
            router.push(`/driver/tracklocation?id=${booking.id}&bookingId=${booking.id}`);
          }
        }
      ]);
    } catch (e) {
      console.log("Start trip error:", e);
      Alert.alert("Error", "Failed to start trip");
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

        {/* 👤 PATIENT INFORMATION CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Patient Information</Text>
          
          <Text style={styles.label}>Patient Name</Text>
          <Text style={styles.value}>{booking.patientName}</Text>

          <Text style={styles.label}>Emergency Type</Text>
          <Text style={styles.value}>{booking.emergency}</Text>

          <Text style={styles.label}>Phone Number</Text>
          <Text style={styles.value}>{booking.phoneNumber || "N/A"}</Text>

          <Text style={styles.label}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* 📍 LOCATION INFORMATION CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Route Information</Text>
          
          <Text style={styles.label}>Pickup Location</Text>
          <Text style={styles.value}>
            {booking.pickupAddress || (booking.pickupLocation 
              ? `${booking.pickupLocation.latitude.toFixed(4)}°, ${booking.pickupLocation.longitude.toFixed(4)}°`
              : "N/A"
            )}
          </Text>
          <Text style={styles.hint}>Tap "Open Map" to see exact location</Text>

          {booking.dropLocation && (
            <>
              <Text style={styles.label}>Destination Location</Text>
              <Text style={styles.value}>
                {booking.destinationAddress || `${booking.dropLocation.latitude.toFixed(4)}°, ${booking.dropLocation.longitude.toFixed(4)}°`}
              </Text>
            </>
          )}

          {booking.destinationAddress && !booking.dropLocation && (
            <>
              <Text style={styles.label}>Destination Address</Text>
              <Text style={styles.value}>{booking.destinationAddress}</Text>
            </>
          )}

          {booking.distance != null && (
            <>
              <Text style={styles.label}>Distance from You</Text>
              <Text style={styles.value}>{booking.distance.toFixed(2)} km</Text>
            </>
          )}

          {booking.distanceKm != null && (
            <>
              <Text style={styles.label}>Pickup to Destination</Text>
              <Text style={styles.value}>{booking.distanceKm.toFixed(2)} km</Text>
            </>
          )}
        </View>

        {/* 💰 FARE & ETA CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Trip Details</Text>
          
          {booking.estimatedFare ? (
            <>
              <Text style={styles.label}>Estimated Fare</Text>
              <Text style={styles.fare}>₹{booking.estimatedFare.toFixed(2)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Estimated Fare</Text>
              <Text style={styles.value}>To be calculated</Text>
            </>
          )}

          {booking.eta != null && (
            <>
              <Text style={styles.label}>Estimated Time to Pickup</Text>
              <Text style={styles.value}>{booking.eta} minutes</Text>
            </>
          )}
        </View>

        {/* 💬 ADDITIONAL MESSAGES CARD */}
        {booking.additionalNotes && (
          <View style={[styles.card, styles.notesCard]}>
            <Text style={styles.cardTitle}>💬 Additional Message</Text>
            <Text style={styles.notesText}>{booking.additionalNotes}</Text>
          </View>
        )}

        {/* ACTION BUTTONS */}
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
// HELPER FUNCTION - GET STATUS COLOR
// ==============================
const getStatusColor = (status: string) => {
  switch(status) {
    case "searching": return "#FFC107";
    case "accepted": return "#2196F3";
    case "arrived": return "#FF9800";
    case "in-progress": return "#9C27B0";
    case "completed": return "#4CAF50";
    case "cancelled": return "#e53935";
    default: return "#999";
  }
};

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f6fa", 
    padding: 20 
  },
  header: { 
    fontSize: 28, 
    fontWeight: "bold", 
    textAlign: "center", 
    marginBottom: 25, 
    color: "#e53935" 
  },
  card: { 
    backgroundColor: "#fff", 
    padding: 20, 
    borderRadius: 15, 
    marginBottom: 20, 
    shadowColor: "#000", 
    shadowOpacity: 0.1, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowRadius: 6, 
    elevation: 5 
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#f0f0f0"
  },
  notesCard: {
    backgroundColor: "#fffbea",
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107"
  },
  notesText: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
    fontStyle: "italic"
  },
  label: { 
    fontSize: 13, 
    color: "#999", 
    marginTop: 12,
    fontWeight: "600"
  },
  value: { 
    fontSize: 16, 
    fontWeight: "bold", 
    marginTop: 4,
    color: "#333"
  },
  fare: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 4,
    color: "#e53935"
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    fontStyle: "italic"
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
    marginBottom: 10
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12
  },
  actions: { 
    gap: 12 
  },
  callBtn: { 
    backgroundColor: "#4CAF50", 
    padding: 15, 
    borderRadius: 10, 
    alignItems: "center" 
  },
  mapBtn: { 
    backgroundColor: "#FF9800", 
    padding: 15, 
    borderRadius: 10, 
    alignItems: "center" 
  },
  acceptBtn: { 
    backgroundColor: "#2196F3", 
    padding: 15, 
    borderRadius: 10, 
    alignItems: "center" 
  },
  arrivedBtn: { 
    backgroundColor: "#FF9800", 
    padding: 15, 
    borderRadius: 10, 
    alignItems: "center" 
  },
  startBtn: { 
    backgroundColor: "#9C27B0", 
    padding: 15, 
    borderRadius: 10, 
    alignItems: "center" 
  },
  completeBtn: { 
    backgroundColor: "#e53935", 
    padding: 15, 
    borderRadius: 10, 
    alignItems: "center" 
  },
  btnText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
  loader: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  
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