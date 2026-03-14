// user/dashboard.tsx
import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../../services/firebase";
import { Booking } from "../driver/driverType";

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ==============================
  // FETCH USER BOOKINGS (REAL-TIME)
  // ==============================
  const fetchBookings = () => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "bookings"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const bookingsList: Booking[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];

      // Sort by requestedAt descending
      setBookings(
        bookingsList.sort((a, b) => b.requestedAt?.toMillis() - a.requestedAt?.toMillis())
      );
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsub = fetchBookings();
    return () => unsub && unsub();
  }, []);

  // ==============================
  // PULL TO REFRESH
  // ==============================
  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  // ==============================
  // NAVIGATE TO TRACKING
  // ==============================
  const trackBooking = (bookingId: string) => {
    router.push(`/user/tracking?bookingId=${bookingId}`);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#e53935" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>🚑 Ambulance App</Text>
      <Text style={styles.subHeader}>User Dashboard</Text>

      {/* Book Ambulance Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Emergency Ambulance</Text>
        <Text style={styles.cardText}>
          Quickly request an ambulance near you in case of emergency.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("./booking")}
          style={styles.bookBtn}
        >
          <Text style={styles.bookBtnText}>Book Ambulance</Text>
        </TouchableOpacity>
      </View>

      {/* Current Bookings */}
      {bookings.length > 0 ? (
        <View style={styles.bookingsSection}>
          <Text style={styles.sectionHeader}>Your Bookings</Text>
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <View style={styles.bookingCard}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Text style={styles.emergency}>Emergency: {item.emergency}</Text>
                <Text style={styles.status}>Status: {item.status}</Text>
                <Text style={styles.requestedAt}>
                  Requested: {item.requestedAt?.toDate().toLocaleString()}
                </Text>
                {item.driverId && (
                  <Text style={styles.driverInfo}>
                    🚑 Driver Assigned
                  </Text>
                )}
                {item.status !== "completed" && (
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() => trackBooking(item.id)}
                  >
                    <Text style={styles.trackBtnText}>Track Ambulance</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.empty}>
          <Text>No bookings yet. Book an ambulance now!</Text>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>✔ Fast Response</Text>
        <Text style={styles.infoText}>✔ Nearby Drivers</Text>
        <Text style={styles.infoText}>✔ Live Tracking</Text>
      </View>
    </View>
  );
}

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    padding: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#e53935",
    textAlign: "center",
  },
  subHeader: {
    fontSize: 18,
    color: "#555",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 25,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 5,
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  cardText: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  bookBtn: {
    backgroundColor: "#e53935",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  bookBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  bookingsSection: {
    width: "100%",
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  bookingCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  emergency: {
    fontSize: 16,
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
  },
  requestedAt: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  driverInfo: {
    fontSize: 14,
    color: "#2196F3",
    marginBottom: 10,
  },
  trackBtn: {
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  trackBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  infoBox: {
    marginTop: 30,
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    marginTop: 50,
  },
});