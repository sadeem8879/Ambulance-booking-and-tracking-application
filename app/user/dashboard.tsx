// user/dashboard.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../services/firebase";
import { Booking } from "../driver/_driverType";

export default function Dashboard() {
  const [tab, setTab] = useState<'day' | 'week' | 'month' | 'all'>('day');
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
      let bookingsList: Booking[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];

      // Filter by tab
      const now = new Date();
      if (tab === 'day') {
        bookingsList = bookingsList.filter(b => {
          const d = b.requestedAt?.toDate();
          return d && d.toDateString() === now.toDateString();
        });
      } else if (tab === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 6);
        bookingsList = bookingsList.filter(b => {
          const d = b.requestedAt?.toDate();
          return d && d >= weekAgo && d <= now;
        });
      } else if (tab === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        bookingsList = bookingsList.filter(b => {
          const d = b.requestedAt?.toDate();
          return d && d >= monthAgo && d <= now;
        });
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
      {/* Header with Logout */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>🚑 Ambulance App</Text>
        <Pressable
          onPress={async () => {
            await signOut(auth);
            router.replace("/");
          }}
          style={styles.logoutBtn}
        >
          <MaterialIcons name="logout" size={26} color="#e53935" />
        </Pressable>
      </View>
      <Text style={styles.subHeader}>User Dashboard</Text>

      {/* Top Segmented Control */}
      <View style={styles.segmentedControl}>
        {['day', 'week', 'month', 'all'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.segment, tab === key && styles.segmentActive]}
            onPress={() => setTab(key as any)}
          >
            <Text style={[styles.segmentText, tab === key && styles.segmentTextActive]}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
          <Text style={styles.emptyText}>No bookings yet. Book an ambulance now!</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#e53935",
    textAlign: "center",
    flex: 1,
  },
  logoutBtn: {
    padding: 6,
    marginLeft: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#e3eaf2',
    borderRadius: 24,
    marginVertical: 18,
    alignSelf: 'center',
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 15,
  },
  segmentTextActive: {
    color: '#1976d2',
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
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
});