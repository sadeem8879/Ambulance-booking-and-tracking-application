import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth } from "../../services/firebase";
import { acceptBooking, goOffline, goOnline, subscribeNearbyBookings } from "./driverservice";
import { Booking } from "./driverType";

export default function DriverDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [online, setOnline] = useState(false);

  // ==============================
  // FETCH LIVE BOOKINGS
  // ==============================
  useEffect(() => {
    const unsubscribe = subscribeNearbyBookings((bookingsList) => {
      setBookings(bookingsList);
    });

    return unsubscribe;
  }, []);

  // ==============================
  // TOGGLE ONLINE / OFFLINE
  // ==============================
  const toggleOnline = async (value: boolean) => {
    if (!auth.currentUser) return;

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

    try {
      await acceptBooking(auth.currentUser.uid, booking);
      Alert.alert("Booking Accepted", `You accepted ${booking.patientName}'s request`);
    } catch (error) {
      console.error("Accept booking error:", error);
      Alert.alert("Error", "Failed to accept booking");
    }
  };

  // ==============================
  // RENDER
  // ==============================
  return (
    <View style={styles.container}>
      {/* Online Toggle */}
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>
          {online ? "🟢 Online" : "🔴 Offline"}
        </Text>
        <Switch value={online} onValueChange={toggleOnline} />
      </View>

      {/* Bookings List */}
      <Text style={styles.header}>Nearby Ambulance Requests</Text>
      {bookings.length === 0 && (
        <Text style={styles.noBookings}>No requests at the moment</Text>
      )}

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.patient}>Patient: {item.patientName}</Text>
            <Text style={styles.emergency}>Emergency: {item.emergency}</Text>
            <Text style={styles.location}>
              Location: {item.pickupLocation.latitude.toFixed(3)}, {item.pickupLocation.longitude.toFixed(3)}
            </Text>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleAcceptBooking(item)}
            >
              <Text style={styles.btnText}>Accept Request</Text>
            </TouchableOpacity>
          </View>
        )}
      />
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
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});