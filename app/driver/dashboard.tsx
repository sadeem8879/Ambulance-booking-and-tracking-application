import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
    acceptBooking,
    calculateDistance,
    completeTrip,
    getDirections,
    getDistanceInMeters,
    goOffline,
    goOnline,
    subscribeNearbyBookings,
    updateBookingETA,
    updateTripETA
} from "../../lib/driverService";
import { Booking, Driver, DriverNotification, GeoLocation, Trip } from "../../lib/driverTypes";
import { markNotificationAsRead, subscribeToNotifications } from "../../lib/notifications";
import { auth, db } from "../../services/firebase";

export default function DriverDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [online, setOnline] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [driverLocation, setDriverLocation] = useState<GeoLocation | null>(null);
  const [autoAccept, setAutoAccept] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const mapRef = useRef<MapView | null>(null);

  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpModalDismissed, setOtpModalDismissed] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // ==============================
  // AUTO-OPEN OTP MODAL WHEN ARRIVED
  // ==============================
  useEffect(() => {
    if (
      currentTrip?.status === "arrived" &&
      !showOtpModal &&
      !otpModalDismissed
    ) {
      console.log("🎯 Trip arrived! Auto-opening OTP modal");
      setShowOtpModal(true);
    }
  }, [currentTrip?.status, otpModalDismissed]);

  // ==============================
  // RESET DISMISSED FLAG WHEN TRIP STATUS CHANGES
  // ==============================
  useEffect(() => {
    if (currentTrip?.status !== "arrived") {
      setOtpModalDismissed(false);
    }
  }, [currentTrip?.status]);

  // ==============================
  // SUBSCRIBE TO NOTIFICATIONS
  // ==============================
  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = subscribeToNotifications(auth.currentUser.uid, (notifs: DriverNotification[]) => {
      setNotifications(notifs.filter(n => !n.read));
    });

    return unsubscribe;
  }, []);

  // ==============================
  // FETCH LIVE BOOKINGS
  // ==============================
  useEffect(() => {
    const unsubscribe = subscribeNearbyBookings((bookingsList) => {
      setBookings(bookingsList);
    }, driverLocation || undefined);

    return unsubscribe;
  }, [driverLocation]);

  // ==============================
  // AUTO ACCEPT NEAREST BOOKING
  // ==============================
  useEffect(() => {
    if (autoAccept && online && driverLocation && bookings.length > 0) {
      const nearestBooking = bookings[0]; // Already sorted by distance
      if (calculateDistance(driverLocation, nearestBooking.pickupLocation) < 5) { // Within 5km
        handleAcceptBooking(nearestBooking);
      }
    }
  }, [autoAccept, online, driverLocation, bookings]);

  // ==============================
  // UPDATE ETA & DISTANCE (EN ROUTE)
  // ==============================
  useEffect(() => {
    if (!driverLocation || !currentTrip) return;

    const updateEta = async () => {
      const destination =
        currentTrip.status === "accepted"
          ? currentTrip.pickupLocation
          : currentTrip.dropLocation || currentTrip.pickupLocation;

      const directions = await getDirections(driverLocation, destination);
      if (!directions) return;

      await updateTripETA(currentTrip.id, directions.distance, directions.eta);
      await updateBookingETA(currentTrip.bookingId, directions.distance, directions.eta);
    };

    const timer = setTimeout(updateEta, 5000);
    return () => clearTimeout(timer);
  }, [driverLocation, currentTrip?.status, currentTrip?.id, currentTrip?.bookingId]);

  // ==============================
  // MAIN EFFECT: Handle driver auth, profile, and active trip
  // ==============================
  useEffect(() => {
    if (!auth.currentUser) {
      console.log("❌ No authenticated user");
      setDriver(null);
      setCurrentTrip(null);
      return;
    }

    const driverId = auth.currentUser.uid;
    console.log("🔵 Setting up subscriptions for driver:", driverId);

    const driverRef = doc(db, "drivers", driverId);
    let tripUnsubscribe: (() => void) | null = null;

    // Subscribe to driver profile
    const driverUnsubscribe = onSnapshot(driverRef, async (driverDoc) => {
      const driverData = driverDoc.data();
      if (!driverData) {
        console.log("❌ Driver document not found");
        return;
      }

      console.log("📱 Driver data loaded:", {
        name: driverData.name,
        online: driverData.online,
        currentTripId: driverData.currentTripId,
      });

      setDriver({ id: driverDoc.id, ...driverData } as Driver);
      setOnline(driverData.online || false);

      if (driverData.location) {
        setDriverLocation(driverData.location);
        setMapRegion((prev) => ({
          ...prev,
          latitude: driverData.location!.latitude,
          longitude: driverData.location!.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }));

        mapRef.current?.animateToRegion(
          {
            latitude: driverData.location.latitude,
            longitude: driverData.location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      }

      // Handle trip subscription
      const currentTripId = driverData.currentTripId;
      
      if (currentTripId) {
        console.log("🚑 Driver has active trip:", currentTripId);
        
        // Unsubscribe from old trip if exists
        if (tripUnsubscribe) {
          tripUnsubscribe();
        }

        const tripRef = doc(db, "trips", currentTripId);

        // Set up real-time listener for the trip
        tripUnsubscribe = onSnapshot(
          tripRef,
          (tripDoc) => {
            if (tripDoc.exists()) {
              const tripData = tripDoc.data();
              console.log("✅ Trip loaded:", {
                status: tripData.status,
                patient: tripData.patientName,
              });
              setCurrentTrip({ id: tripDoc.id, ...tripData } as Trip);
            } else {
              console.log("❌ Trip document not found:", currentTripId);
              setCurrentTrip(null);
            }
          },
          (error) => {
            console.error("❌ Error subscribing to trip:", error);
          }
        );
      } else {
        console.log("ℹ️ No active trip for driver");
        setCurrentTrip(null);
        if (tripUnsubscribe) {
          tripUnsubscribe();
          tripUnsubscribe = null;
        }
      }
    });

    return () => {
      console.log("🔴 Cleaning up driver subscriptions");
      driverUnsubscribe();
      if (tripUnsubscribe) {
        tripUnsubscribe();
      }
    };
  }, [auth.currentUser]);

  // ==============================
  // TOGGLE ONLINE / OFFLINE
  // ==============================
  const toggleOnline = async (value: boolean) => {
    if (!auth.currentUser) return;

    // Require admin approval before going online
    if (value && driver && !driver.approved) {
      Alert.alert(
        "Approval Required",
        "Your account is pending admin approval. You can only go online once approved."
      );
      return;
    }

    try {
      if (value) {
        await goOnline(auth.currentUser.uid);
        setOnline(true);
        Alert.alert("Status", "You are now ONLINE");
      } else {
        await goOffline(auth.currentUser.uid);
        setOnline(false);
        Alert.alert("Status", "You are now OFFLINE");
      }
    } catch (error) {
      console.error("Toggle online error:", error);
      Alert.alert("Error", "Failed to update status");
    }
  };

  // ==============================
  // GET TRIP STATUS COLOR
  // ==============================
  const getTripStatusColor = (status: string): string => {
    switch(status) {
      case "accepted": return "#2196F3";
      case "arrived": return "#FF9800";
      case "in-progress": return "#9C27B0";
      case "completed": return "#4CAF50";
      case "cancelled": return "#e53935";
      default: return "#999";
    }
  };

  // ==============================
  // ACCEPT BOOKING
  // ==============================
  const handleAcceptBooking = async (booking: Booking) => {
    if (!auth.currentUser) return;

    // Check if driver is already on a trip
    if (driver?.currentTripId) {
      Alert.alert("Cannot Accept", "You are currently on an active trip. Complete it first.");
      return;
    }

    try {
      await acceptBooking(auth.currentUser.uid, booking, driverLocation || undefined);
      Alert.alert("Booking Accepted", `You accepted ${booking.patientName}'s request`);
    } catch (error) {
      console.error("Accept booking error:", error);
      Alert.alert("Error", "Failed to accept booking");
    }
  };

  // ==============================
  // START TRIP
  // ==============================
  const handleStartTrip = async () => {
    if (!auth.currentUser || !currentTrip) return;

    try {
      // Generate OTP and send to user
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      await updateDoc(doc(db, "trips", currentTrip.id), {
        otp: otp,
        otpGeneratedAt: new Date(),
      });
      
      Alert.alert("Trip Started", "Safe journey!");
      // Navigate to tracking screen
      router.push(`/driver/tracklocation?id=${currentTrip.bookingId}&bookingId=${currentTrip.bookingId}`);
    } catch (error) {
      console.error("Start trip error:", error);
      Alert.alert("Error", "Failed to start trip");
    }
  };

  // ==============================
  // COMPLETE TRIP
  // ==============================
  const handleCompleteTrip = async () => {
    if (!auth.currentUser || !currentTrip) return;

    try {
      await completeTrip(auth.currentUser.uid, currentTrip.id);
      setCurrentTrip(null);
      Alert.alert("Trip Completed", "Thank you for your service!");
    } catch (error) {
      console.error("Complete trip error:", error);
      Alert.alert("Error", "Failed to complete trip");
    }
  };

  // ==============================
  // CANCEL TRIP
  // ==============================
  const handleCancelTrip = () => {
    Alert.alert(
      "Cancel Trip",
      "Are you sure you want to cancel this trip?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              if (!auth.currentUser || !currentTrip) return;
              
              // Update trip status to cancelled
              const tripRef = doc(db, "trips", currentTrip.id);
              await updateDoc(tripRef, {
                status: "cancelled",
                cancelledAt: new Date(),
                cancelledBy: "driver"
              });

              // Update booking status to cancelled
              const bookingRef = doc(db, "bookings", currentTrip.bookingId);
              await updateDoc(bookingRef, {
                status: "cancelled",
                cancelledAt: new Date(),
                cancelledBy: "driver"
              });

              // Clear current trip
              const driverRef = doc(db, "drivers", auth.currentUser.uid);
              await updateDoc(driverRef, {
                currentTripId: null
              });

              setCurrentTrip(null);
              Alert.alert("Trip Cancelled", "Trip has been cancelled successfully");
            } catch (error) {
              console.error("Cancel trip error:", error);
              Alert.alert("Error", "Failed to cancel trip");
            }
          }
        }
      ]
    );
  };

  // ==============================
  // VERIFY OTP
  // ==============================
  const handleVerifyOtp = async () => {
    if (!otpInput || otpInput.length !== 4) {
      Alert.alert("Invalid OTP", "Please enter a 4-digit OTP");
      return;
    }

    if (!currentTrip || !currentTrip.otp) {
      Alert.alert("Error", "OTP not found");
      return;
    }

    setIsVerifying(true);
    try {
      // Verify OTP matches
      if (otpInput === currentTrip.otp) {
        // Update trip to in-progress
        await updateDoc(doc(db, "trips", currentTrip.id), {
          status: "in-progress",
          otpVerifiedAt: Date.now(),
        });

        // Update booking to in-progress
        await updateDoc(doc(db, "bookings", currentTrip.bookingId), {
          status: "in-progress",
          otpVerifiedAt: Date.now(),
        });

        setShowOtpModal(false);
        setOtpInput("");
        Alert.alert("✅ Success!", "OTP verified! Trip started. Head to hospital.");
      } else {
        Alert.alert("❌ Wrong OTP", "OTP does not match. Please try again.");
        setOtpInput("");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      Alert.alert("Error", "Failed to verify OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  // ==============================
  // LOGOUT
  // ==============================
  const handleLogout = async () => {
    if (!auth.currentUser) return;

    try {
      // 1. Set driver offline
      await goOffline(auth.currentUser.uid);
      
      // 2. Small delay to ensure offline status is saved
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. Sign out from Firebase
      await signOut(auth);
      
      // 4. Force navigation back to login with role selection
      router.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout properly. Please try closing and reopening the app.");
      // Force navigation even if logout fails
      try {
        signOut(auth);
        router.replace("/");
      } catch (e: any) {
        console.log("Force logout failed:", e);
      }
    }
  };

  // ==============================
  // RENDER
  // ==============================
  const ListHeader = () => (
    <>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Driver Dashboard</Text>
          {driver && (
            <Text style={styles.subHeader}>
              {driver.name} • {driver.approved ? "Approved" : "Pending approval"}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={mapRegion}
          showsUserLocation={true}
          followsUserLocation={true}
        >
          {/* Driver Location Marker */}
          {driverLocation && (
            <Marker
              coordinate={driverLocation}
              title="Your Location"
              description="Ambulance"
              pinColor="blue"
            />
          )}

          {/* Booking Markers */}
          {bookings.map((booking) => (
            <Marker
              key={booking.id}
              coordinate={booking.pickupLocation}
              title={booking.patientName}
              description={`Emergency: ${booking.emergency}`}
              pinColor="red"
            />
          ))}

          {/* Current Trip Pickup Location Marker */}
          {currentTrip && currentTrip.pickupLocation && (
            <Marker
              coordinate={currentTrip.pickupLocation}
              title={currentTrip.patientName}
              description="Pickup Location"
              pinColor="orange"
            />
          )}

          {/* Current Trip Drop Location Marker */}
          {currentTrip && currentTrip.dropLocation && (
            <Marker
              coordinate={currentTrip.dropLocation}
              title="Drop Location"
              description="Destination"
              pinColor="green"
            />
          )}

          {/* Trip Route Polyline */}
          {currentTrip && currentTrip.routePolyline && (
            <Polyline
              coordinates={currentTrip.routePolyline}
              strokeColor="#000"
              strokeWidth={3}
            />
          )}
        </MapView>
      </View>

      {/* Online Toggle */}
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>
          {online ? "🟢 Online" : "🔴 Offline"}
        </Text>
        <Switch value={online} onValueChange={toggleOnline} />
      </View>

      {/* Auto Accept Toggle */}
      {online && (
        <View style={styles.autoAcceptBox}>
          <Text style={styles.autoAcceptText}>Auto-Accept Nearest Requests</Text>
          <Switch value={autoAccept} onValueChange={setAutoAccept} />
        </View>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <View style={styles.notificationsBox}>
          <Text style={styles.notificationsHeader}>Notifications ({notifications.length})</Text>
          {notifications.slice(0, 3).map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={styles.notificationItem}
              onPress={() => markNotificationAsRead(notif.id)}
            >
              <Text style={styles.notificationTitle}>{notif.title}</Text>
              <Text style={styles.notificationMessage}>{notif.message}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Active Trip */}
      {currentTrip && (
        <View style={styles.tripBox}>
          <Text style={styles.tripTitle}>🚑 Current Trip</Text>
          
          <View style={styles.tripInfoRow}>
            <Text style={styles.tripLabel}>Patient Name</Text>
            <Text style={styles.tripValue}>{currentTrip.patientName}</Text>
          </View>
          
          <View style={styles.tripInfoRow}>
            <Text style={styles.tripLabel}>Phone</Text>
            <Text style={styles.tripValue}>{currentTrip.userPhone}</Text>
          </View>

          <View style={styles.tripInfoRow}>
            <Text style={styles.tripLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getTripStatusColor(currentTrip.status) }]}>
              <Text style={styles.statusBadgeText}>{currentTrip.status.toUpperCase()}</Text>
            </View>
          </View>

          {currentTrip.estimatedFare && (
            <View style={styles.tripInfoRow}>
              <Text style={styles.tripLabel}>Estimated Fare</Text>
              <Text style={styles.fareValue}>₹{currentTrip.estimatedFare.toFixed(2)}</Text>
            </View>
          )}

          {currentTrip.distance != null && (
            <View style={styles.tripInfoRow}>
              <Text style={styles.tripLabel}>Distance to You</Text>
              <Text style={styles.tripValue}>{currentTrip.distance.toFixed(2)} km</Text>
            </View>
          )}

          {currentTrip.distanceKm != null && (
            <View style={styles.tripInfoRow}>
              <Text style={styles.tripLabel}>Pickup → Destination</Text>
              <Text style={styles.tripValue}>{currentTrip.distanceKm.toFixed(2)} km</Text>
            </View>
          )}

          {currentTrip.eta != null && (
            <View style={styles.tripInfoRow}>
              <Text style={styles.tripLabel}>ETA to Pickup</Text>
              <Text style={styles.tripValue}>{currentTrip.eta} minutes</Text>
            </View>
          )}

          {currentTrip.status === "arrived" && (
            <View style={styles.otpInfoBox}>
              <Text style={styles.otpInfoText}>✅ Arrived at Pickup Location</Text>
              <Text style={styles.otpInfoSubtext}>Waiting for passenger OTP verification</Text>
            </View>
          )}

          {driverLocation && currentTrip.pickupLocation && currentTrip.status === "accepted" && (
            <View style={styles.distanceWarningBox}>
              <Text style={styles.distanceWarningText}>
                ⚠️ Distance remaining before arrival: {Math.round(getDistanceInMeters(driverLocation, currentTrip.pickupLocation))} meters
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${currentTrip.userPhone}`)}>
            <Text style={styles.callText}>📞 Call Patient</Text>
          </TouchableOpacity>
          
          {currentTrip.status === "accepted" && (
            <TouchableOpacity 
              style={styles.arrivedBtn}
              onPress={async () => {
                try {
                  // ✅ VALIDATE: Check if driver is within 100m of pickup location
                  if (!driverLocation) {
                    Alert.alert("Location Error", "Unable to get your current location. Please enable GPS.");
                    return;
                  }

                  const distanceMeters = getDistanceInMeters(driverLocation, currentTrip.pickupLocation);
                  
                  if (distanceMeters > 100) {
                    const distanceKm = (distanceMeters / 1000).toFixed(2);
                    Alert.alert(
                      "⚠️ Not at Pickup Location",
                      `You are ${distanceKm} km away from the pickup location.\n\nPlease drive closer before marking as arrived.\n\nDistance remaining: ${Math.round(distanceMeters)} meters`,
                      [{ text: "OK" }]
                    );
                    return;
                  }

                  // ✅ Update status to arrived
                  await updateDoc(doc(db, "trips", currentTrip.id), {
                    status: "arrived",
                    arrivedAt: Date.now(),
                  });
                  await updateDoc(doc(db, "bookings", currentTrip.bookingId), {
                    status: "arrived",
                    arrivedAt: Date.now(),
                  });
                  
                  Alert.alert("✅ Arrived", "You have arrived at the pickup location!");
                  console.log("✅ Marked as arrived");
                } catch (error) {
                  console.error("Error marking arrived:", error);
                  Alert.alert("Error", "Failed to mark as arrived");
                }
              }}
            >
              <Text style={styles.btnText}>📍 Mark as Arrived</Text>
            </TouchableOpacity>
          )}
          {currentTrip.status === "arrived" && (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => {
                setOtpModalDismissed(false);
                setShowOtpModal(true);
              }}
            >
              <Text style={styles.btnText}>🔐 Get Passenger OTP</Text>
            </TouchableOpacity>
          )}
          {currentTrip.status === "in-progress" && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={handleCompleteTrip}
            >
              <Text style={styles.btnText}>Complete Trip</Text>
            </TouchableOpacity>
          )}
          {currentTrip.status !== "completed" && (
            <TouchableOpacity style={styles.cancelTripBtn} onPress={() => handleCancelTrip()}>
              <Text style={styles.cancelTripText}>Cancel Trip</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bookings List */}
      <Text style={styles.header}>Nearby Ambulance Requests</Text>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={styles.container}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={styles.noBookings}>No requests at the moment</Text>
          </View>
        }
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        renderItem={({ item }) => {
          const hasLocation =
            item.pickupLocation &&
            typeof item.pickupLocation.latitude === "number" &&
            typeof item.pickupLocation.longitude === "number";

          return (
            <View style={styles.card}>
              <Text style={styles.patient}>Patient: {item.patientName}</Text>
              <Text style={styles.emergency}>Emergency: {item.emergency}</Text>
              <Text style={styles.phone}>Phone: {item.phoneNumber}</Text>
              <Text style={styles.location}>
                Location: {hasLocation ? `${item.pickupLocation.latitude.toFixed(3)}, ${item.pickupLocation.longitude.toFixed(3)}` : "Unknown"}
              </Text>
              <TouchableOpacity
                style={[styles.acceptBtn, driver?.currentTripId && styles.disabledBtn]}
                onPress={() => handleAcceptBooking(item)}
                disabled={!hasLocation || !!driver?.currentTripId}
              >
                <Text style={styles.btnText}>
                  {!hasLocation ? "Invalid request" : driver?.currentTripId ? "On Active Trip" : "Accept Request"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* OTP VERIFICATION MODAL */}
      <Modal
      visible={showOtpModal && currentTrip?.status === "arrived"}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.otpModalOverlay}>
        <View style={styles.otpModalContent}>
          <Text style={styles.otpModalTitle}>🔐 Verify Passenger</Text>
          <Text style={styles.otpModalSubtitle}>
            Ask the passenger to read the 4-digit OTP from their app screen and enter it below
          </Text>

          {/* Input Section Only - No OTP Display */}
          <View style={styles.otpInputSection}>
            <Text style={styles.otpInputLabel}>Enter OTP from Passenger:</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="----"
              keyboardType="numeric"
              maxLength={4}
              value={otpInput}
              onChangeText={setOtpInput}
              placeholderTextColor="#999"
              editable={!isVerifying}
            />
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.otpVerifyBtn, isVerifying && styles.otpVerifyBtnDisabled]}
            onPress={handleVerifyOtp}
            disabled={isVerifying || otpInput.length !== 4}
          >
            {isVerifying ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.otpVerifyBtnText}>✅ Verify & Start Trip</Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.otpCancelBtn}
            onPress={() => {
              setShowOtpModal(false);
              setOtpInput("");
              setOtpModalDismissed(true);
            }}
            disabled={isVerifying}
          >
            <Text style={styles.otpCancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.otpNote}>
            ℹ️ The passenger sees the OTP in their app. Ask them to read it to you.
          </Text>
        </View>
      </View>
    </Modal>
    </View>
  );
}

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f6fa",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  subHeader: {
    fontSize: 14,
    color: "#555",
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#e53935",
    borderRadius: 10,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
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
  statusBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  autoAcceptBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  autoAcceptText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  notificationsBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  notificationsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#FF9800",
  },
  notificationItem: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#e53935",
  },
  noBookings: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  patient: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  emergency: {
    fontSize: 16,
    marginBottom: 5,
  },
  phone: {
    fontSize: 16,
    marginBottom: 5,
    color: "#2196F3",
  },
  location: {
    fontSize: 14,
    marginBottom: 10,
    color: "#555",
  },
  acceptBtn: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledBtn: {
    backgroundColor: "#ccc",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  tripBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  otpInfoBox: {
    backgroundColor: "#fff8e1",
    borderLeftWidth: 4,
    borderLeftColor: "#fbc02d",
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 8,
  },
  otpInfoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f57c00",
  },
  otpInfoSubtext: {
    fontSize: 12,
    color: "#8d6e63",
    marginTop: 4,
  },
  tripTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#e53935",
  },
  info: {
    fontSize: 16,
    marginBottom: 5,
  },
  callBtn: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  callText: {
    color: "#fff",
    fontWeight: "bold",
  },
  startBtn: {
    backgroundColor: "#FF9800",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  arrivedBtn: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  completeBtn: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  cancelTripBtn: {
    backgroundColor: "#d32f2f",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  cancelTripText: {
    color: "#fff",
    fontWeight: "bold",
  },
  otpModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  otpModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  otpModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e53935",
    textAlign: "center",
    marginBottom: 10,
  },
  otpModalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  otpDisplaySection: {
    backgroundColor: "#f0f8f4",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#4CAF50",
    alignItems: "center",
  },
  otpLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    fontWeight: "600",
  },
  otpCodeBox: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4CAF50",
    marginBottom: 10,
  },
  otpCode: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
    letterSpacing: 8,
  },
  otpCopyHint: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
  },
  otpInputSection: {
    marginBottom: 20,
  },
  otpInputLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    fontWeight: "600",
  },
  otpInput: {
    borderWidth: 2,
    borderColor: "#e53935",
    borderRadius: 10,
    padding: 12,
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 8,
    color: "#333",
  },
  otpVerifyBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 14,
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
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  otpCancelBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  otpNote: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  tripInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tripLabel: {
    fontSize: 14,
    color: "#999",
    fontWeight: "600",
  },
  tripValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },
  fareValue: {
    fontSize: 18,
    color: "#e53935",
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  distanceWarningBox: {
    backgroundColor: "#fff3e0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
    padding: 10,
    marginVertical: 10,
    borderRadius: 8,
  },
  distanceWarningText: {
    fontSize: 14,
    color: "#e65100",
    fontWeight: "500",
  },
});