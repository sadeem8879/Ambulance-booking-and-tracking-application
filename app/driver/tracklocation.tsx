import { useLocalSearchParams } from "expo-router";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { autoMarkAsArrived } from "../../lib/driverService";
import { GeoLocation } from "../../lib/driverTypes";
import { db } from "../../services/firebase";

let locationSubscription: Location.LocationSubscription | null = null;
let currentTripId: string | null = null;
let currentBookingId: string | null = null;

type LocationType = {
  latitude: number;
  longitude: number;
};

// Import location after MapView to ensure proper initialization
import * as Location from "expo-location";
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
  const [dropLocation, setDropLocation] = useState<LocationType | null>(null);
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [status, setStatus] = useState<string>("En route to patient");
  const [distance, setDistance] = useState<number>(0);
  const [pickupDropDistance, setPickupDropDistance] = useState<number>(0);
  const [fareAmount, setFareAmount] = useState<number>(0);
  const [eta, setEta] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [tripStatus, setTripStatus] = useState<string>("accepted");
  const [otp, setOtp] = useState<string>("");
  const [displayOtp, setDisplayOtp] = useState<string>("");
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpModalDismissed, setOtpModalDismissed] = useState<boolean>(false);
  const [verifyingOtp, setVerifyingOtp] = useState<boolean>(false);
  const [tripId, setTripId] = useState<string>("");

  // Rate per km constant
  const RATE_PER_KM = 50;

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
  // VERIFY OTP FROM DRIVER
  // ==============================
  const handleOtpVerification = async () => {
    const enteredOtp = otp.trim();

    if (!enteredOtp || enteredOtp.length !== 4) {
      Alert.alert("Invalid OTP", "Please enter a 4-digit OTP");
      return;
    }

    if (!tripId) {
      Alert.alert("Error", "Trip ID not found");
      return;
    }

    setVerifyingOtp(true);
    try {
      const tripRef = doc(db, "trips", tripId);
      const tripSnap = await getDoc(tripRef);
      const tripData = tripSnap.data();

      if (!tripData || !tripData.otp) {
        Alert.alert("Error", "OTP not generated yet. Please wait.");
        setVerifyingOtp(false);
        return;
      }

      const storedOtp = tripData.otp.toString().trim();

      // Verify if driver's OTP matches the stored OTP
      if (enteredOtp === storedOtp) {
        // ✅ OTP MATCH - Start the trip
        await updateDoc(tripRef, {
          status: "in-progress",
          otpVerifiedAt: Date.now(),
          otpVerifiedBy: "driver"
        });

        // Update booking too
        const bookingRef = doc(db, "bookings", tripData.bookingId);
        await updateDoc(bookingRef, {
          status: "in-progress",
          otpVerifiedAt: Date.now()
        });

        setShowOtpModal(false);
        setOtp("");
        Alert.alert("✅ Success!", "OTP verified! Trip has started. Head to the hospital.");
      } else {
        // ❌ OTP MISMATCH
        Alert.alert("❌ Wrong OTP", "The OTP you entered does not match. Please ask the patient again.");
        setOtp("");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      Alert.alert("Error", "Failed to verify OTP");
    } finally {
      setVerifyingOtp(false);
    }
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

      // DROP / DESTINATION LOCATION (hospital / patient destination)
      const bookingDropLocation = data.dropLocation?.latitude && data.dropLocation?.longitude
        ? { latitude: data.dropLocation.latitude, longitude: data.dropLocation.longitude }
        : data.destination?.latitude && data.destination?.longitude
        ? { latitude: data.destination.latitude, longitude: data.destination.longitude }
        : data.destinationLocation?.latitude && data.destinationLocation?.longitude
        ? { latitude: data.destinationLocation.latitude, longitude: data.destinationLocation.longitude }
        : null;

      if (bookingDropLocation) {
        setDropLocation(bookingDropLocation);
      }

      // Set destination address
      if (data.destinationAddress) {
        setDestinationAddress(data.destinationAddress);
      }

      if (bookingDropLocation) {
        setDropLocation(bookingDropLocation);
      }

      // Compute fare based on pickup->drop distance
      if (bookingUserLocation && bookingDropLocation) {
        const dist = calculateDistance(
          bookingUserLocation.latitude,
          bookingUserLocation.longitude,
          bookingDropLocation.latitude,
          bookingDropLocation.longitude
        );
        setPickupDropDistance(dist);
        // Use booking's estimated fare if available, otherwise calculate
        if (data.estimatedFare) {
          setFareAmount(data.estimatedFare);
        } else {
          setFareAmount(dist * RATE_PER_KM);
        }
      } else {
        setPickupDropDistance(0);
        setFareAmount(0);
      }

      // DRIVER LOCATION
      if (data.driverLocation) {
        setDriverLocation({
          latitude: data.driverLocation.latitude,
          longitude: data.driverLocation.longitude,
        });
      }

      // STATUS
      if (data.status) {
        setStatus(data.status);
        setTripStatus(data.status);
      }

      // STORE TRIP ID
      if (data.tripId) {
        setTripId(data.tripId);
      }

      // SHOW OTP MODAL WHEN STATUS IS ARRIVED
      const normalizedStatus = String(data.status || "").toLowerCase().trim();
      if (normalizedStatus === "arrived") {
        setDisplayOtp(data.otp || "");
      } else {
        // If status changes away from arrived, reset dismissal and close modal state
        setOtpModalDismissed(false);
      }

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
        
        // ✅ AUTO-MARK AS ARRIVED if within 50m of pickup location
        if (bookingId && data.status === "accepted") {
          autoMarkAsArrived(String(bookingId), data.driverLocation as GeoLocation, bookingUserLocation as GeoLocation);
        }
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

  // Ensure modal open logic is driven by stable UI state (not stale snapshot closure)
  useEffect(() => {
    if (tripStatus === "arrived") {
      if (!showOtpModal && !otpModalDismissed) {
        setShowOtpModal(true);
      }
    } else {
      // close and reset when trip leaves arrived state
      setShowOtpModal(false);
      setOtpModalDismissed(false);
    }
  }, [tripStatus, showOtpModal, otpModalDismissed]);

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
        {/* USER/PATIENT MARKER */}
        {userLocation && (
          <Marker 
            coordinate={userLocation} 
            title="Patient Pickup Location" 
            pinColor="blue" 
          />
        )}

        {/* DRIVER MARKER */}
        {driverLocation && (
          <Marker 
            coordinate={driverLocation} 
            title="Your Ambulance" 
            pinColor="red" 
          />
        )}

        {/* DESTINATION MARKER */}
        {dropLocation && (
          <Marker
            coordinate={dropLocation}
            title="Destination"
            description={destinationAddress || "Hospital / Drop location"}
            pinColor="green"
          />
        )}

        {/* ROUTE POLYLINE */}
        {driverLocation && userLocation && (
          <Polyline 
            coordinates={[driverLocation, userLocation]} 
            strokeWidth={5} 
            strokeColor="#e53935" 
          />
        )}

        {/* DESTINATION POLYLINE - When heading to hospital */}
        {tripStatus === "in-progress" && userLocation && dropLocation && (
          <Polyline 
            coordinates={[userLocation, dropLocation]} 
            strokeWidth={3} 
            strokeColor="#4CAF50" 
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* INFO PANEL */}
      <View style={styles.infoBox}>
        {/* OTP DISPLAY - Show when trip is accepted and OTP is available */}
        {tripStatus === "accepted" && displayOtp && (
          <View style={styles.otpDisplayBox}>
            <Text style={styles.otpDisplayLabel}>🔐 Share OTP</Text>
            <Text style={styles.otpDisplayCode}>{displayOtp}</Text>
            <Text style={styles.otpDisplayHint}>Read to patient</Text>
          </View>
        )}

        {/* DESTINATION / PAYMENT SUMMARY */}
        <View style={styles.fareInfoBox}>
          <Text style={styles.fareLabel}>📍 Destination</Text>
          {destinationAddress ? (
            <Text style={styles.fareText}>{destinationAddress}</Text>
          ) : dropLocation ? (
            <Text style={styles.fareText}>
              {dropLocation.latitude.toFixed(4)}, {dropLocation.longitude.toFixed(4)}
            </Text>
          ) : (
            <Text style={styles.fareText}>Not available</Text>
          )}

          <Text style={[styles.fareLabel, { marginTop: 10 }]}>💵 Fare Details</Text>
          <Text style={styles.fareText}>
            Distance: {pickupDropDistance.toFixed(2)} km
          </Text>
          <Text style={styles.fareText}>
            Rate: ₹{RATE_PER_KM}/km
          </Text>
          <Text style={styles.fareAmount}>Total Fare: ₹{fareAmount.toFixed(2)}</Text>
        </View>

        {tripStatus === "arrived" || distance < 0.05 ? (
          <>
            <Text style={[styles.title, styles.arrivedTitle]}>🎉 ARRIVED!</Text>
            <Text style={styles.arrivedSubtitle}>Waiting for OTP verification</Text>
            <View style={styles.arrivedDetails}>
              <Text style={styles.otpMessage}>📱 Ask patient to verify OTP</Text>
            </View>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => {
                setOtpModalDismissed(false);
                setShowOtpModal(true);
              }}
            >
              <Text style={styles.btnText}>🔐 Get Passenger OTP</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>🚑 En Route to Patient</Text>
            <Text style={styles.status}>Status: {status}</Text>
            <Text style={styles.info}>📍 Distance: {distance.toFixed(2)} km</Text>
            <Text style={styles.info}>⏱️ ETA: {eta} minutes</Text>
            {distance < 0.5 && (
              <Text style={styles.closingMessage}>🟢 Very close! You are arriving soon...</Text>
            )}
          </>
        )}
      </View>

      {/* OTP VERIFICATION MODAL */}
      <Modal
        visible={showOtpModal && String(tripStatus || "").toLowerCase() === "arrived"}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.otpModalOverlay}>
          <View style={styles.otpModal}>
            <Text style={styles.otpTitle}>🔐 Verify OTP</Text>
            <Text style={styles.otpSubtitle}>Enter OTP the patient tells you</Text>

            <View style={styles.otpInputContainer}>
              <TextInput
                placeholder="----"
                style={styles.otpInput}
                value={otp}
                onChangeText={setOtp}
                maxLength={4}
                keyboardType="numeric"
                placeholderTextColor="#999"
                editable={!verifyingOtp}
              />
            </View>

            <Text style={styles.otpHint}>
              Ask patient for their 4-digit OTP
            </Text>

            <TouchableOpacity
              style={[styles.otpVerifyBtn, verifyingOtp && styles.otpVerifyBtnDisabled]}
              onPress={handleOtpVerification}
              disabled={verifyingOtp || otp.length !== 4}
            >
              {verifyingOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.otpVerifyBtnText}>✓ Verify & Start</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.otpCancelBtn}
              onPress={() => {
                setShowOtpModal(false);
                setOtp("");
                setOtpModalDismissed(true);
              }}
              disabled={verifyingOtp}
            >
              <Text style={styles.otpCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  arrivedTitle: {
    fontSize: 24,
    color: "#4CAF50",
    marginBottom: 6,
  },
  arrivedSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
  arrivedDetails: {
    backgroundColor: "#f0f8f4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  arrivedMessage: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
    marginBottom: 8,
  },
  waitingMessage: {
    fontSize: 13,
    color: "#FF9800",
    fontWeight: "600",
    marginBottom: 8,
  },
  otpMessage: {
    fontSize: 13,
    color: "#2196F3",
    fontWeight: "600",
  },
  actionButtons: {
    backgroundColor: "#fff9e6",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF9800",
    marginBottom: 6,
  },
  actionHint: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  closingMessage: {
    textAlign: "center",
    fontSize: 14,
    color: "#FF9800",
    fontWeight: "bold",
    marginTop: 12,
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
  otpModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  otpModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e53935",
    textAlign: "center",
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  otpInputContainer: {
    marginBottom: 20,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: "#e53935",
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 8,
    color: "#333",
  },
  otpHint: {
    fontSize: 13,
    color: "#FF9800",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600",
  },
  otpVerifyBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    elevation: 3,
  },
  otpVerifyBtnDisabled: {
    backgroundColor: "#ccc",
  },
  otpVerifyBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  otpCancelBtn: {
    borderWidth: 2,
    borderColor: "#999",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  otpCancelBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  
  // OTP Display Box for Driver
  otpDisplayBox: {
    backgroundColor: "#FFF9C4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FBC02D",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  otpDisplayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F57F17",
    marginBottom: 8,
  },
  otpDisplayCode: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F57F17",
    letterSpacing: 4,
    marginBottom: 8,
  },
  otpDisplayHint: {
    fontSize: 12,
    color: "#E65100",
    fontWeight: "500",
  },
  fareInfoBox: {
    backgroundColor: "#f8f8ff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
  },
  fareLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  fareText: {
    fontSize: 14,
    color: "#444",
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e7d32",
    marginTop: 6,
  },
  startBtn: {
    backgroundColor: "#e53935",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

