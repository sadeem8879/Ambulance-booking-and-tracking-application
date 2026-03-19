import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
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

// Helper function to calculate distance between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

useEffect(() => {
  if (!bookingId) return;

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

      // No user-side OTP input flow: user shares displayed OTP with driver
      
      if (data.driverId) {
        // Subscribe to driver location from driver document
        const driverRef = doc(db, "drivers", data.driverId);
        const unsubDriver = onSnapshot(driverRef, (driverSnap) => {
          const driverData = driverSnap.data();
          if (driverData && driverData.location) {
            setDriverLocation(driverData.location);
          }
        });

        // Also subscribe to trip for driver location if trip exists
        let unsubTrip: (() => void) | null = null;
        if (data.tripId) {
          const tripRef = doc(db, "trips", data.tripId);
          unsubTrip = onSnapshot(tripRef, (tripSnap) => {
            const tripData = tripSnap.data();
            if (tripData && tripData.driverLocation) {
              setDriverLocation(tripData.driverLocation);
            }
          });
        }

        return () => {
          unsubDriver();
          if (unsubTrip) unsubTrip();
        };
      }
    }
    setLoading(false);
  });

return () => unsubBooking();
}, [bookingId]);

// ==============================
// CANCEL BOOKING
// ==============================
const handleCancelBooking = () => {
  Alert.alert(
    "Cancel Booking",
    "Are you sure you want to cancel this ambulance request?",
    [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            // ✅ Cancel the booking
            await updateDoc(doc(db, "bookings", bookingId), {
              status: "cancelled",
              cancelledAt: new Date(),
              cancelledBy: "user"
            });

            // ✅ If trip exists, cancel it too and clear driver's currentTripId
            if (booking?.tripId && booking?.driverId) {
              // Cancel the trip
              await updateDoc(doc(db, "trips", booking.tripId), {
                status: "cancelled",
                cancelledAt: new Date(),
                cancelledBy: "user"
              });

              // Clear driver's active trip
              await updateDoc(doc(db, "drivers", booking.driverId), {
                currentTripId: null
              });

              console.log("Trip cancelled and driver cleared:", booking.tripId);
            }

            Alert.alert("Cancelled", "Booking has been cancelled");
            router.replace('/user/dashboard');
          } catch (error) {
            console.error("Cancel error:", error);
            Alert.alert("Error", "Failed to cancel booking");
          }
        }
      }
    ]
  );
};

if (loading) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#e53935"/>
      <Text style={styles.loading}>Finding ambulances in your area...</Text>
    </View>
  );
}

if (!booking) {
  return (
    <View style={styles.center}>
      <Text style={styles.error}>Booking not found</Text>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.replace('/user/dashboard')}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

return (
  <View style={styles.container}>
    {/* OTP Display in Top-Right Corner */}
    {booking.otp && booking.status !== "completed" && booking.status !== "cancelled" && (
      <View style={styles.otpTopRightContainer}>
        <View style={styles.otpTopRightBox}>
          <Text style={styles.otpLabel}>🔐 OTP</Text>
          <Text style={styles.otpCode}>{booking.otp}</Text>
          <Text style={styles.otpInstruction}>Share with driver</Text>
        </View>
      </View>
    )}

    <ScrollView showsVerticalScrollIndicator={false}>

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
            title="Your Location"
            description={booking.patientName}
            pinColor="red"
          />

          {/* Destination Location - Show if available */}
          {booking.destinationLocation && (
            <Marker
              coordinate={booking.destinationLocation}
              title="Hospital / Destination"
              description={booking.destinationAddress || "Drop-off point"}
              pinColor="green"
            />
          )}

          {/* Driver Location - Show for all statuses except "searching" and "cancelled" */}
          {driverLocation && booking.status !== "searching" && booking.status !== "cancelled" && (
            <Marker
              coordinate={driverLocation}
              title="Ambulance"
              description={`Driver: ${booking.driverName || 'En Route'}`}
              pinColor="blue"
            />
          )}

          {/* Route Polyline if available - Show when driver is assigned and heading toward patient */}
          {(booking.status === "accepted" || booking.status === "arrived" || booking.status === "in-progress") && driverLocation && (
            <Polyline
              coordinates={[driverLocation, booking.pickupLocation]}
              strokeColor="#e53935"
              strokeWidth={3}
            />
          )}

          {/* Route to Destination during in-progress */}
          {booking.status === "in-progress" && booking.destinationLocation && (
            <Polyline
              coordinates={[booking.pickupLocation, booking.destinationLocation]}
              strokeColor="#4CAF50"
              strokeWidth={2}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>
      </View>

      {/* DESTINATION & FARE INFO */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>📍 Trip Details</Text>
        
        {/* Pickup */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>From:</Text>
          <Text style={styles.infoValue}>{booking.patientName}'s Location</Text>
        </View>

        {/* Destination */}
        {booking.destinationAddress && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>To:</Text>
            <Text style={styles.infoValue}>{booking.destinationAddress}</Text>
          </View>
        )}

        {/* Distance & Fare */}
        {booking.distanceKm && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance:</Text>
              <Text style={styles.infoValue}>{booking.distanceKm.toFixed(2)} km</Text>
            </View>
            <View style={[styles.infoRow, styles.fareHighlight]}>
              <Text style={styles.infoLabel}>Est. Fare:</Text>
              <Text style={styles.fareAmount}>₹{booking.estimatedFare?.toFixed(2) || '0.00'}</Text>
            </View>
          </>
        )}
      </View>

      {/* Status Card */}
      <View style={styles.card}>
        {/* SEARCHING STATUS */}
        {booking.status === "searching" && (
          <>
            <Text style={styles.waiting}>⏳ Searching for Ambulances</Text>
            <Text style={styles.patient}>Patient: {booking.patientName}</Text>
            <Text style={styles.emergency}>Emergency: {booking.emergency}</Text>
            <Text style={styles.description}>We are looking for the nearest available ambulance in your area...</Text>
            <ActivityIndicator size="large" color="#e53935" style={{ marginTop: 15 }} />
          </>
        )}

        {/* ACCEPTED STATUS - DRIVER EN ROUTE */}
        {booking.status === "accepted" && (
          <>
            <Text style={styles.success}>✅ Ambulance Found! Driver En Route</Text>
            <View style={styles.infoBox}>
              <Text style={styles.patient}>🚑 Driver: {booking.driverName || 'Driver'}</Text>
              <Text style={styles.patient}>📞 Contact: {booking.driverPhone || 'N/A'}</Text>
              {booking.distance && booking.eta && (
                <View style={styles.etaBox}>
                  <Text style={styles.eta}>📍 Distance: {booking.distance.toFixed(1)} km away</Text>
                  <Text style={styles.eta}>⏱️ ETA: ~{booking.eta} minutes</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.callButton} 
              onPress={() => Linking.openURL(`tel:${booking.driverPhone}`)}
            >
              <Text style={styles.callText}>📞 Call Driver</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ARRIVED STATUS - SHOW OTP IN TOP RIGHT for driver confirmation */}
        {booking.status === "arrived" && (
          <>
            <Text style={styles.arrived}>🎯 Driver Arrived at Your Location!</Text>
            <View style={styles.infoBox}>
              <Text style={styles.patient}>Driver: {booking.driverName || 'Driver'}</Text>
              <Text style={styles.description}>Driver is here. Share the OTP from the top-right box with them.</Text>
              <Text style={styles.description}>Once they enter the OTP in their app, the trip will start automatically.</Text>
            </View>
            <TouchableOpacity 
              style={styles.callButton} 
              onPress={() => Linking.openURL(`tel:${booking.driverPhone}`)}
            >
              <Text style={styles.callText}>📞 Call Driver</Text>
            </TouchableOpacity>
          </>
        )}

        {/* IN-PROGRESS STATUS */}
        {booking.status === "in-progress" && (
          <>
            <Text style={styles.success}>🏥 Trip In Progress</Text>
            <View style={styles.infoBox}>
              <Text style={styles.patient}>Heading to Hospital</Text>
              <Text style={styles.patient}>Driver: {booking.driverName || 'Driver'}</Text>
              {booking.distance && booking.eta && (
                <View style={styles.etaBox}>
                  <Text style={styles.eta}>📍 Distance: {booking.distance.toFixed(1)} km to hospital</Text>
                  <Text style={styles.eta}>⏱️ ETA: ~{booking.eta} minutes</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.callButton} 
              onPress={() => Linking.openURL(`tel:${booking.driverPhone}`)}
            >
              <Text style={styles.callText}>📞 Call Driver</Text>
            </TouchableOpacity>
          </>
        )}

        {/* COMPLETED STATUS */}
        {booking.status === "completed" && (
          <>
            <Text style={styles.success}>✅ Trip Completed</Text>
            <Text style={styles.description}>Thank you for using our ambulance service. Patient has been safely delivered to the hospital.</Text>
            <TouchableOpacity 
              style={styles.homeButton} 
              onPress={() => router.replace('/user/dashboard')}
            >
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </>
        )}

        {/* CANCELLED STATUS */}
        {booking.status === "cancelled" && (
          <>
            <Text style={styles.cancelled}>❌ Booking Cancelled</Text>
            <TouchableOpacity 
              style={styles.homeButton} 
              onPress={() => router.replace('/user/dashboard')}
            >
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Cancel Button - Show for active bookings */}
        {booking.status !== "completed" && booking.status !== "cancelled" && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => handleCancelBooking()}
          >
            <Text style={styles.cancelText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>

  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#e53935",
  },
  mapContainer: {
    height: 300,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  map: {
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    padding: 25,
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  
  // Status Indicators
  waiting: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#FF9800",
  },
  success: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#4CAF50",
  },
  arrived: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#FF6F00",
  },
  cancelled: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#d32f2f",
  },
  
  // Info boxes
  infoBox: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#e53935",
  },
  etaBox: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  patient: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "500",
    color: "#333",
  },
  emergency: {
    fontSize: 16,
    marginBottom: 10,
    color: "#d32f2f",
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: "#666",
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginTop: 10,
  },
  eta: {
    fontSize: 15,
    marginBottom: 5,
    fontWeight: "600",
    color: "#2196F3",
  },
  info: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  
  // Buttons
  callButton: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  callText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  otpButton: {
    backgroundColor: "#FF9800",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  otpButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#d32f2f",
    padding: 14,
    borderRadius: 10,
    marginTop: 15,
    alignItems: "center",
  },
  cancelText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  homeButton: {
    backgroundColor: "#2196F3",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
  homeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  backButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 10,
    paddingHorizontal: 30,
    marginTop: 15,
  },
  backButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  
  // Loading & Error
  loading: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  error: {
    fontSize: 18,
    color: "#e53935",
    fontWeight: "bold",
  },
  
  // OTP Modal
  otpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  otpContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 25,
    paddingVertical: 30,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    alignItems: "center",
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  otpSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: "#e53935",
    borderRadius: 12,
    padding: 18,
    fontSize: 32,
    textAlign: "center",
    width: "100%",
    marginBottom: 25,
    letterSpacing: 12,
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
  },
  otpVerifyButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 4,
  },
  otpVerifyButtonDisabled: {
    backgroundColor: "#ccc",
  },
  otpCancelButton: {
    padding: 14,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 15,
  },
  otpCancelText: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
  otpNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
  
  // OTP Top-Right Corner Display
  otpTopRightContainer: {
    position: "absolute",
    top: 60,
    right: 15,
    zIndex: 100,
    pointerEvents: "none",
  },
  otpTopRightBox: {
    backgroundColor: "#FFE082",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "#FFA000",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 8,
    alignItems: "center",
  },
  otpLabel: {
    fontSize: 11,
    color: "#F57F17",
    fontWeight: "600",
    marginBottom: 4,
  },
  otpCode: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F57F17",
    letterSpacing: 3,
    marginBottom: 4,
  },
  otpInstruction: {
    fontSize: 10,
    color: "#E65100",
    fontWeight: "500",
  },
  
  // Trip Details Info Card
  infoCard: {
    backgroundColor: "#FFF9C4",
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    borderLeftWidth: 5,
    borderLeftColor: "#FBC02D",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F57F17",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE082",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "right",
    marginLeft: 10,
  },
  fareHighlight: {
    borderBottomWidth: 2,
    borderBottomColor: "#FBC02D",
    marginTop: 5,
    paddingVertical: 12,
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F57F17",
  },
});

