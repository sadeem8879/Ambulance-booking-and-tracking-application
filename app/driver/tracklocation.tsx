import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { checkArrivalSafety, generateGoogleMapsNavigationUrl } from "../../lib/driverService";
import { GeoLocation } from "../../lib/driverTypes";
import { db } from "../../services/firebase";

let locationSubscription: Location.LocationSubscription | null = null;

type LocationType = {
  latitude: number;
  longitude: number;
};

// ==============================
// UTILITY: DISTANCE CALCULATION (Haversine Formula)
// ==============================
const calculateDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
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

const calculateDistanceInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  return calculateDistanceInMeters(lat1, lon1, lat2, lon2) / 1000;
};

// ==============================
// REQUEST LOCATION PERMISSION
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
// START REAL-TIME DRIVER TRACKING
// ==============================
export const startDriverTracking = async (driverId: string): Promise<void> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    // Watch driver position with HIGH accuracy
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, // Update every 3 seconds
        distanceInterval: 5, // Or every 5 meters
      },
      async (location) => {
        const geoLocation: GeoLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
        };

        try {
          // Update driver document with latest location
          await updateDoc(doc(db, "drivers", driverId), {
            location: geoLocation,
            lastLocationUpdate: Date.now(),
          });
        } catch (err) {
          console.error("Failed to update driver location:", err);
        }
      }
    );

    console.log("✅ Driver tracking started");
  } catch (error) {
    console.error("❌ Start tracking error:", error);
  }
};

// ==============================
// STOP DRIVER TRACKING
// ==============================
export const stopDriverTracking = (): void => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    console.log("✅ Driver tracking stopped");
  }
};

// ==============================
// GET CURRENT LOCATION (One-time)
// ==============================
export const getCurrentLocation = async (): Promise<LocationType | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error("Get current location error:", error);
    return null;
  }
};

// ==============================
// MAIN DRIVER TRACKING COMPONENT
// ==============================
export default function Tracking() {
  const params = useLocalSearchParams();
  const bookingId = (params.id ?? params.bookingId) as string | undefined;
  const mapRef = useRef<any>(null);

  // ==============================
  // STATE VARIABLES
  // ==============================
  const [driverLocation, setDriverLocation] = useState<LocationType | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationType | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationType | null>(null);
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [pickupAddress, setPickupAddress] = useState<string>("");

  // Distance and fare
  const [distanceToPickup, setDistanceToPickup] = useState<number>(0);
  const [distancePickupToDestination, setDistancePickupToDestination] = useState<number>(0);
  const [estimatedFare, setEstimatedFare] = useState<number>(0);
  const [estimatedETA, setEstimatedETA] = useState<number>(0);

  // Trip status and data
  const [tripStatus, setTripStatus] = useState<string>("accepted");
  const [bookingStatus, setBookingStatus] = useState<string>("accepted");
  const [patientName, setPatientName] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [tripId, setTripId] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [displayOtp, setDisplayOtp] = useState<string>("");

  // UI States
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [verifyingOtp, setVerifyingOtp] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userOtpInput, setUserOtpInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Live driver marker animation reference
  const driverMarkerRef = useRef<any>(null);

  // Real-time location watch
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  // ==============================
  // EFFECT: REAL-TIME LOCATION WATCH
  // ==============================
  useEffect(() => {
    let isMounted = true;

    const startLocationWatch = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setError("Location permission is required. Please grant location access and restart.");
        setLoading(false);
        return;
      }

      try {
        locationWatchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000, // Update every 2 seconds
            distanceInterval: 5, // Or every 5 meters
          },
          (location) => {
            if (!isMounted) return;

            const currentLocation: LocationType = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            setDriverLocation(currentLocation);

            // Update Firestore with driver location
            if (bookingId) {
              updateDoc(doc(db, "bookings", bookingId), {
                driverLocation: currentLocation,
                lastLocationUpdate: Date.now(),
              }).catch(err => console.error("Failed to update booking location:", err));
            }
          }
        );
      } catch (error) {
        console.error("❌ Location watch error:", error);
        setError("Failed to start location tracking. Please restart the app.");
        setLoading(false);
      }
    };

    startLocationWatch();

    return () => {
      isMounted = false;
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }
    };
  }, [bookingId]);

  // ==============================
  // EFFECT: REAL-TIME BOOKING DATA LISTENER
  // ==============================
  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    const bookingRef = doc(db, "bookings", bookingId);
    const unsubscribe = onSnapshot(
      bookingRef,
      (snapshot) => {
        try {
          const data: any = snapshot.data();
          if (!data) {
            setLoading(false);
            return;
          }

          // ✅ FETCH ALL DRIVER DASHBOARD FIELDS
        setPatientName(data.patientName || "");
        setPatientPhone(data.phoneNumber || "");
        setAdditionalNotes(data.additionalNotes || "");
        setBookingStatus(data.status || "accepted");
        setEstimatedFare(data.estimatedFare || 0);
        setDestinationAddress(data.destinationAddress || "");
        setPickupAddress(data.pickupAddress || "Map Location");
        setTripId(data.tripId || "");

        // Parse pickup location
        if (data.pickupLocation?.latitude && data.pickupLocation?.longitude) {
          setPickupLocation({
            latitude: data.pickupLocation.latitude,
            longitude: data.pickupLocation.longitude,
          });
        }

        // Parse destination location
        if (
          data.destinationLocation?.latitude &&
          data.destinationLocation?.longitude
        ) {
          setDestinationLocation({
            latitude: data.destinationLocation.latitude,
            longitude: data.destinationLocation.longitude,
          });
        }

        // OTP from booking
        if (data.otp) {
          setOtp(String(data.otp));
          setDisplayOtp(String(data.otp));
        }

        setLoading(false);
        } catch (error) {
          console.error("❌ Booking snapshot error:", error);
          setError("Failed to load booking data. Please retry.");
          setLoading(false);
        }
      },
      (error) => {
        console.error("❌ Booking listener error:", error);
        setError("Booking listener error. Please check network connection.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [bookingId]);

  // ==============================
  // CALCULATE DISTANCES AND UPDATE ETA
  // ==============================
  useEffect(() => {
    if (!driverLocation || !pickupLocation) return;

    // Distance from driver to pickup
    const toPickupKm = calculateDistanceInKm(
      driverLocation.latitude,
      driverLocation.longitude,
      pickupLocation.latitude,
      pickupLocation.longitude
    );
    setDistanceToPickup(toPickupKm);

    // Calculate ETA (assuming 40 km/h average speed)
    const avgSpeed = 40;
    const etaMinutes = Math.max(1, Math.round((toPickupKm / avgSpeed) * 60));
    setEstimatedETA(etaMinutes);

    // Distance from pickup to destination
    if (destinationLocation) {
      const pickupToDestKm = calculateDistanceInKm(
        pickupLocation.latitude,
        pickupLocation.longitude,
        destinationLocation.latitude,
        destinationLocation.longitude
      );
      setDistancePickupToDestination(pickupToDestKm);
    }
  }, [driverLocation, pickupLocation, destinationLocation]);

  // ==============================
  // AUTO-FIT MAP WHEN ALL LOCATIONS AVAILABLE
  // ==============================
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: () => setError(null) }]);
    }
  }, [error]);

  useEffect(() => {
    if (!mapRef.current) return;

    const coordinates: LocationType[] = [];

    if (driverLocation) coordinates.push(driverLocation);
    if (pickupLocation) coordinates.push(pickupLocation);
    if (destinationLocation) coordinates.push(destinationLocation);

    if (coordinates.length >= 2) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 120, right: 100, bottom: 150, left: 100 },
        animated: true,
      });
    }
  }, [driverLocation, pickupLocation, destinationLocation]);

  // ==============================
  // ANIMATE DRIVER MARKER AS IT MOVES
  // ==============================
  useEffect(() => {
    if (driverLocation && driverMarkerRef.current?.animateMarkerToCoordinate) {
      driverMarkerRef.current.animateMarkerToCoordinate(driverLocation, 1000);
    }
  }, [driverLocation]);

  // ==============================
  // OPEN GOOGLE MAPS NAVIGATION
  // ==============================
  const handleOpenNavigation = () => {
    if (!driverLocation || !pickupLocation) {
      Alert.alert("Error", "Location data not available");
      return;
    }

    try {
      const mapsUrl = generateGoogleMapsNavigationUrl(driverLocation, pickupLocation);
      Linking.openURL(mapsUrl);
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Could not open navigation");
    }
  };

  // ==============================
  // CALL PATIENT
  // ==============================
  const handleCallPatient = () => {
    if (!patientPhone) {
      Alert.alert("Error", "Patient phone number not available");
      return;
    }

    const telUrl = Platform.OS === "android" ? `tel:${patientPhone}` : `telprompt:${patientPhone}`;
    Linking.openURL(telUrl).catch((error) => {
      console.error("Call error:", error);
      Alert.alert("Error", "Unable to place call");
    });
  };

  // ==============================
  // MARK AS ARRIVED (WITH DISTANCE VALIDATION)
  // ==============================
  const handleMarkAsArrived = async () => {
    if (!driverLocation || !pickupLocation || !bookingId || !tripId) {
      Alert.alert("Error", "Missing location data");
      return;
    }

    // ✅ DISTANCE VALIDATION - MUST BE WITHIN 100 METERS
    const safetyCheck = checkArrivalSafety(driverLocation, pickupLocation);

    if (!safetyCheck.canArrive) {
      Alert.alert(
        "❌ Too Far Away",
        safetyCheck.message,
        [{ text: "OK" }]
      );
      return;
    }

    try {
      // ✅ UPDATE BOTH BOOKING AND TRIP STATUS TO "ARRIVED"
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "arrived",
        arrivedAt: Date.now(),
        driverLocation: {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
        },
      });

      await updateDoc(doc(db, "trips", tripId), {
        status: "arrived",
        arrivedAt: Date.now(),
      });

      Alert.alert("✅ Marked as Arrived", "Get passenger OTP to start trip");
    } catch (error) {
      console.error("❌ Mark as arrived error:", error);
      Alert.alert("Error", "Failed to mark as arrived");
    }
  };

  // ==============================
  // VERIFY OTP AND START TRIP
  // ==============================
  const handleVerifyOtp = async () => {
    const enteredOtp = userOtpInput.trim();

    if (!enteredOtp || enteredOtp.length !== 4) {
      Alert.alert("Invalid OTP", "Please enter a 4-digit OTP");
      return;
    }

    if (!otp || String(enteredOtp) !== String(otp)) {
      Alert.alert("❌ Wrong OTP", "The OTP you entered does not match. Please try again.");
      setUserOtpInput("");
      return;
    }

    if (!tripId || !bookingId) {
      Alert.alert("Error", "Trip or booking ID not found");
      return;
    }

    setVerifyingOtp(true);

    try {
      // ✅ UPDATE TRIP AND BOOKING TO "IN-PROGRESS"
      await updateDoc(doc(db, "trips", tripId), {
        status: "in-progress",
        otpVerifiedAt: Date.now(),
        otpVerifiedBy: "driver",
      });

      await updateDoc(doc(db, "bookings", bookingId), {
        status: "in-progress",
        otpVerifiedAt: Date.now(),
      });

      setShowOtpModal(false);
      setUserOtpInput("");
      Alert.alert(
        "✅ OTP Verified!",
        "Trip started successfully. Head to the hospital.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("❌ OTP verification error:", error);
      Alert.alert("Error", "Failed to verify OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ==============================
  // RENDER: LOADING STATE
  // ==============================
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#e53935" />
        <Text style={{ marginTop: 10, fontSize: 16, color: "#666" }}>
          Loading trip details...
        </Text>
      </View>
    );
  }

  if (!driverLocation || !pickupLocation) {
    return (
      <View style={styles.loader}>
        <Text style={{ fontSize: 16, color: "#666", textAlign: "center" }}>
          Unable to load location data. Please go back and try again.
        </Text>
      </View>
    );
  }

  // ✅ DETERMINE BUTTON STATES BASED ON STATUS
  const canMarkAsArrived = bookingStatus === "accepted" && tripStatus !== "arrived";
  const canShowOtpButton = bookingStatus === "arrived" || tripStatus === "arrived";
  const canVerifyOtp = canShowOtpButton && otp;

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== MAP ===== */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* DRIVER MARKER */}
        {driverLocation && (
          <Marker.Animated
            ref={driverMarkerRef}
            coordinate={driverLocation}
            title="🚑 Your Ambulance"
            pinColor="red"
            description="Current location"
          />
        )}

        {/* PICKUP MARKER */}
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="📍 Pickup Location"
            pinColor="blue"
            description={pickupAddress}
          />
        )}

        {/* DESTINATION MARKER */}
        {destinationLocation && (
          <Marker
            coordinate={destinationLocation}
            title="🏥 Destination"
            pinColor="green"
            description={destinationAddress || "Hospital"}
          />
        )}

        {/* ROUTE: DRIVER → PICKUP */}
        {driverLocation && pickupLocation && (
          <Polyline
            coordinates={[driverLocation, pickupLocation]}
            strokeWidth={4}
            strokeColor="#e53935"
            lineDashPattern={[5, 5]}
          />
        )}

        {/* ROUTE: PICKUP → DESTINATION (during trip) */}
        {tripStatus === "in-progress" &&
          pickupLocation &&
          destinationLocation && (
            <Polyline
              coordinates={[pickupLocation, destinationLocation]}
              strokeWidth={3}
              strokeColor="#4CAF50"
              lineDashPattern={[8, 8]}
            />
          )}
      </MapView>

      {/* ===== INFO PANEL ===== */}
      <View style={styles.infoPanelWrapper}>
        <ScrollView style={styles.infoPanel} showsVerticalScrollIndicator={true}>
          {/* KEY INFO HEADER - LIKE UBER */}
          <View style={styles.keyInfoHeader}>
            <View style={styles.fareBox}>
              <Text style={styles.fareLabel}>Estimated Fare</Text>
              <Text style={styles.fareAmount}>₹{estimatedFare.toFixed(2)}</Text>
            </View>
            <View style={styles.distanceBox}>
              <Text style={styles.distanceLabel}>Distance to Pickup</Text>
              <Text style={styles.distanceAmount}>{distanceToPickup.toFixed(2)} km</Text>
            </View>
            <View style={styles.etaBox}>
              <Text style={styles.etaLabel}>ETA</Text>
              <Text style={styles.etaAmount}>{estimatedETA} min</Text>
            </View>
          </View>

          {/* PATIENT DETAILS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Patient Details</Text>
            <Text style={styles.detailText}>
              <Text style={styles.label}>Name: </Text>
              <Text style={styles.value}>{patientName || "N/A"}</Text>
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.label}>Phone: </Text>
              <Text style={styles.value}>{patientPhone || "N/A"}</Text>
            </Text>
            {additionalNotes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>💬 Patient Notes:</Text>
                <Text style={styles.notesText}>{additionalNotes}</Text>
              </View>
            )}
          </View>

          {/* PICKUP LOCATION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Pickup Location</Text>
            <Text style={styles.addressText}>
              {pickupAddress || `${pickupLocation?.latitude.toFixed(4)}, ${pickupLocation?.longitude.toFixed(4)}`}
            </Text>
          </View>

          {/* DESTINATION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Destination (Hospital)</Text>
            <Text style={styles.addressText}>
              {destinationAddress || (destinationLocation ? `${destinationLocation.latitude.toFixed(4)}, ${destinationLocation.longitude.toFixed(4)}` : "N/A")}
            </Text>
          </View>

          {/* TRIP DETAILS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🗺️ Route Details</Text>
            <Text style={styles.detailText}>
              📍 Pickup → Hospital: {distancePickupToDestination.toFixed(2)} km
            </Text>
            <Text style={styles.detailText}>
              ⏱️ Estimated Distance: {(distanceToPickup + distancePickupToDestination).toFixed(2)} km
            </Text>
          </View>

          {/* DRIVER ACTION PANEL */}
          <View style={styles.actionPanel}>
            <Text style={styles.sectionTitle}>🚨 Driver Tools</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={[styles.button, styles.callButton]} onPress={handleCallPatient}>
                <Text style={styles.buttonText}>📞 Call Patient</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.navigateButton]} onPress={handleOpenNavigation}>
                <Text style={styles.buttonText}>🗺️ Open Navigation</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.buttonContainer}>
            {/* NAVIGATION BUTTON (GOOGLE MAPS) */}
            <TouchableOpacity
              style={[styles.button, styles.navigationButton]}
              onPress={handleOpenNavigation}
            >
              <Text style={styles.buttonText}>🗺️ Open Navigation</Text>
            </TouchableOpacity>

            {/* MARK AS ARRIVED BUTTON */}
            {canMarkAsArrived && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                distanceToPickup > 0.1 && styles.buttonDisabled,
              ]}
              onPress={handleMarkAsArrived}
              disabled={distanceToPickup > 0.1}
            >
              <Text style={styles.buttonText}>✓ Mark as Arrived</Text>
              <Text style={styles.buttonSubtext}>(Within 100m to activate)</Text>
            </TouchableOpacity>
          )}

          {/* GET OTP BUTTON */}
          {canShowOtpButton && (
            <TouchableOpacity
              style={[styles.button, styles.otpButton]}
              onPress={() => setShowOtpModal(true)}
              disabled={!canVerifyOtp}
            >
              <Text style={styles.buttonText}>🔐 Get Passenger OTP</Text>
            </TouchableOpacity>
          )}

          {/* TRIP IN PROGRESS */}
          {tripStatus === "in-progress" && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅ Trip in Progress</Text>
              <Text style={styles.successSubtext}>Head to {destinationAddress || "destination"}</Text>
            </View>
          )}
          </View>
        </ScrollView>
      </View>

      {/* ===== OTP VERIFICATION MODAL ===== */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔐 Verify OTP</Text>
            <Text style={styles.modalSubtitle}>
              Ask passenger for the 4-digit OTP they received
            </Text>

            {/* OTP DISPLAY */}
            {displayOtp && (
              <View style={styles.otpDisplayBox}>
                <Text style={styles.otpDisplayLabel}>OTP to Share:</Text>
                <Text style={styles.otpDisplayCode}>{displayOtp}</Text>
              </View>
            )}

            {/* OTP INPUT */}
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 4-digit OTP"
              value={userOtpInput}
              onChangeText={setUserOtpInput}
              keyboardType="numeric"
              maxLength={4}
              editable={!verifyingOtp}
              placeholderTextColor="#999"
            />

            {/* VERIFY BUTTON */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.verifyButton,
                (!canVerifyOtp || userOtpInput.length !== 4 || verifyingOtp) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleVerifyOtp}
              disabled={
                !canVerifyOtp ||
                userOtpInput.length !== 4 ||
                verifyingOtp
              }
            >
              {verifyingOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>✓ Verify & Start Trip</Text>
              )}
            </TouchableOpacity>

            {/* CANCEL BUTTON */}
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowOtpModal(false);
                setUserOtpInput("");
              }}
              disabled={verifyingOtp}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  infoPanelWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "55%",
    minHeight: 120,
    height: "55%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 8,
    elevation: 10,
  },
  infoPanel: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
  },
  fareText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2e7d32",
  },
  notesBox: {
    backgroundColor: "#fff3e0",
    borderLeftWidth: 3,
    borderLeftColor: "#FF9800",
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E65100",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: "#D84315",
  },
  actionPanel: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  callButton: {
    flex: 1,
    backgroundColor: "#1E88E5",
  },
  navigateButton: {
    flex: 1,
    backgroundColor: "#43A047",
  },
  buttonContainer: {
    gap: 10,
    marginTop: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: "#2196F3",
  },
  navigationButton: {
    backgroundColor: "#6A5ACD",
  },
  otpButton: {
    backgroundColor: "#FF9800",
  },
  verifyButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  successBox: {
    backgroundColor: "#e8f5e9",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  successText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2e7d32",
  },
  successSubtext: {
    fontSize: 12,
    color: "#558b2f",
    marginTop: 4,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e53935",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  otpDisplayBox: {
    backgroundColor: "#FFF9C4",
    borderLeftWidth: 4,
    borderLeftColor: "#FBC02D",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  otpDisplayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F57F17",
    marginBottom: 6,
  },
  otpDisplayCode: {
    fontSize: 32,
    fontWeight: "800",
    color: "#F57F17",
    letterSpacing: 6,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: "#e53935",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 8,
    color: "#333",
    marginBottom: 16,
  },
  coordinatesText: {
    fontSize: 12,
    color: "#888",
    fontFamily: "monospace",
  },
  // NEW UBER-LIKE STYLES
  keyInfoHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  fareBox: {
    flex: 1,
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  fareLabel: {
    fontSize: 11,
    color: "#558b2f",
    fontWeight: "600",
    marginBottom: 4,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2e7d32",
  },
  distanceBox: {
    flex: 1,
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  distanceLabel: {
    fontSize: 11,
    color: "#1565c0",
    fontWeight: "600",
    marginBottom: 4,
  },
  distanceAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1976D2",
  },
  etaBox: {
    flex: 1,
    backgroundColor: "#fff3e0",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  etaLabel: {
    fontSize: 11,
    color: "#e65100",
    fontWeight: "600",
    marginBottom: 4,
  },
  etaAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F57C00",
  },
  label: {
    fontWeight: "600",
    color: "#666",
  },
  value: {
    fontWeight: "400",
    color: "#333",
  },
  addressText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    lineHeight: 22,
  },
  buttonSubtext: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
});
