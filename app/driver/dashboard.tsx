import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, DocumentSnapshot, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    Linking,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
    acceptBooking,
    calculateDistance,
    completeTrip,
    getDirections,
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
  // GET DRIVER PROFILE, LOCATION & CURRENT TRIP
  // ==============================
  useEffect(() => {
    if (!auth.currentUser) return;

    const driverRef = doc(db, "drivers", auth.currentUser.uid);
    let tripUnsubscribe: (() => void) | null = null;

    const unsubscribe = onSnapshot(driverRef, (driverDoc) => {
      const data = driverDoc.data();
      if (!data) return;

      const driverData = { id: driverDoc.id, ...data } as Driver;
      setDriver(driverData);
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

        // Animate camera to latest driver location
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

      const tripId = driverData.currentTripId;
      if (tripId) {
        if (tripUnsubscribe) {
          tripUnsubscribe();
          tripUnsubscribe = null;
        }
        const tripRef = doc(db, "trips", tripId);
        tripUnsubscribe = onSnapshot(tripRef, (tripDoc: DocumentSnapshot) => {
          if (tripDoc.exists()) {
            setCurrentTrip({ id: tripDoc.id, ...tripDoc.data() } as Trip);
          }
        });
      } else {
        setCurrentTrip(null);
        if (tripUnsubscribe) {
          tripUnsubscribe();
          tripUnsubscribe = null;
        }
      }
    });

    return () => {
      unsubscribe();
      if (tripUnsubscribe) tripUnsubscribe();
    };
  }, []);

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
  // LOGOUT
  // ==============================
  const handleLogout = async () => {
    if (!auth.currentUser) return;

    try {
      await goOffline(auth.currentUser.uid);
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
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
          <Text style={styles.tripTitle}>Current Trip</Text>
          <Text style={styles.info}>Patient: {currentTrip.patientName}</Text>
          <Text style={styles.info}>User Phone: {currentTrip.userPhone}</Text>
          <Text style={styles.info}>Status: {currentTrip.status}</Text>
          {currentTrip.distance != null && (
            <Text style={styles.info}>Distance: {currentTrip.distance.toFixed(1)} km</Text>
          )}
          {currentTrip.eta != null && (
            <Text style={styles.info}>ETA: {currentTrip.eta} min</Text>
          )}
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${currentTrip.userPhone}`)}>
            <Text style={styles.callText}>Call User</Text>
          </TouchableOpacity>
          {currentTrip.status === "accepted" && (
            <TouchableOpacity style={styles.startBtn} onPress={handleStartTrip}>
              <Text style={styles.btnText}>Start Trip</Text>
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
});