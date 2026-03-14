// // user/dashboard.tsx
// import { router } from "expo-router";
// import { collection, onSnapshot, query, where } from "firebase/firestore";
// import { useEffect, useState } from "react";
// import {
//     ActivityIndicator,
//     FlatList,
//     RefreshControl,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
// } from "react-native";
// import { auth, db } from "../../services/firebase";
// import { Booking } from "../driver/driverType";

// export default function Dashboard() {
//   const [bookings, setBookings] = useState<Booking[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   // ==============================
//   // FETCH USER BOOKINGS (REAL-TIME)
//   // ==============================
//   const fetchBookings = () => {
//     if (!auth.currentUser) return;

//     const q = query(
//       collection(db, "bookings"),
//       where("userId", "==", auth.currentUser.uid)
//     );

//     const unsubscribe = onSnapshot(q, (snap) => {
//       const bookingsList: Booking[] = snap.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       })) as Booking[];

//       // Sort by requestedAt descending
//       setBookings(
//         bookingsList.sort((a, b) => b.requestedAt?.toMillis() - a.requestedAt?.toMillis())
//       );
//       setLoading(false);
//       setRefreshing(false);
//     });

//     return unsubscribe;
//   };

//   useEffect(() => {
//     const unsub = fetchBookings();
//     return () => unsub && unsub();
//   }, []);

//   // ==============================
//   // PULL TO REFRESH
//   // ==============================
//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchBookings();
//   };

//   // ==============================
//   // NAVIGATE TO TRACKING
//   // ==============================
//   const trackBooking = (bookingId: string) => {
//     router.push(`/user/tracking?bookingId=${bookingId}`);
//   };

//   if (loading) {
//     return (
//       <View style={styles.loader}>
//         <ActivityIndicator size="large" color="#e53935" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <Text style={styles.header}>🚑 Ambulance App</Text>
//       <Text style={styles.subHeader}>User Dashboard</Text>

//       {/* Book Ambulance Card */}
//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Emergency Ambulance</Text>
//         <Text style={styles.cardText}>
//           Quickly request an ambulance near you in case of emergency.
//         </Text>
//         <TouchableOpacity
//           onPress={() => router.push("./booking")}
//           style={styles.bookBtn}
//         >
//           <Text style={styles.bookBtnText}>Book Ambulance</Text>
//         </TouchableOpacity>
//       </View>

//       {/* Current Bookings */}
//       {bookings.length > 0 ? (
//         <View style={styles.bookingsSection}>
//           <Text style={styles.sectionHeader}>Your Bookings</Text>
//           <FlatList
//             data={bookings}
//             keyExtractor={(item) => item.id}
//             refreshControl={
//               <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//             }
//             renderItem={({ item }) => (
//               <View style={styles.bookingCard}>
//                 <Text style={styles.patientName}>{item.patientName}</Text>
//                 <Text style={styles.emergency}>Emergency: {item.emergency}</Text>
//                 <Text style={styles.status}>Status: {item.status}</Text>
//                 <Text style={styles.requestedAt}>
//                   Requested: {item.requestedAt?.toDate().toLocaleString()}
//                 </Text>
//                 {item.driverId && (
//                   <Text style={styles.driverInfo}>
//                     🚑 Driver Assigned
//                   </Text>
//                 )}
//                 {item.status !== "completed" && (
//                   <TouchableOpacity
//                     style={styles.trackBtn}
//                     onPress={() => trackBooking(item.id)}
//                   >
//                     <Text style={styles.trackBtnText}>Track Ambulance</Text>
//                   </TouchableOpacity>
//                 )}
//               </View>
//             )}
//           />
//         </View>
//       ) : (
//         <View style={styles.empty}>
//           <Text>No bookings yet. Book an ambulance now!</Text>
//         </View>
//       )}

//       {/* Info Section */}
//       <View style={styles.infoBox}>
//         <Text style={styles.infoText}>✔ Fast Response</Text>
//         <Text style={styles.infoText}>✔ Nearby Drivers</Text>
//         <Text style={styles.infoText}>✔ Live Tracking</Text>
//       </View>
//     </View>
//   );
// }

// // ==============================
// // STYLES
// // ==============================
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f4f6f8",
//     padding: 20,
//   },
//   header: {
//     fontSize: 32,
//     fontWeight: "bold",
//     color: "#e53935",
//     textAlign: "center",
//   },
//   subHeader: {
//     fontSize: 18,
//     color: "#555",
//     marginBottom: 20,
//     textAlign: "center",
//   },
//   card: {
//     backgroundColor: "#fff",
//     width: "100%",
//     padding: 25,
//     borderRadius: 15,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 4 },
//     shadowRadius: 5,
//     elevation: 5,
//     alignItems: "center",
//     marginBottom: 20,
//   },
//   cardTitle: {
//     fontSize: 20,
//     fontWeight: "bold",
//     marginBottom: 10,
//   },
//   cardText: {
//     textAlign: "center",
//     color: "#666",
//     marginBottom: 20,
//   },
//   bookBtn: {
//     backgroundColor: "#e53935",
//     paddingVertical: 12,
//     paddingHorizontal: 30,
//     borderRadius: 10,
//   },
//   bookBtnText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "bold",
//   },
//   bookingsSection: {
//     width: "100%",
//     marginBottom: 20,
//   },
//   sectionHeader: {
//     fontSize: 20,
//     fontWeight: "bold",
//     marginBottom: 10,
//     color: "#333",
//   },
//   bookingCard: {
//     backgroundColor: "#fff",
//     padding: 15,
//     borderRadius: 12,
//     marginBottom: 10,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 4 },
//     shadowRadius: 6,
//     elevation: 5,
//   },
//   patientName: {
//     fontSize: 18,
//     fontWeight: "bold",
//   },
//   emergency: {
//     fontSize: 16,
//     marginBottom: 5,
//   },
//   status: {
//     fontSize: 16,
//     marginBottom: 10,
//   },
//   requestedAt: {
//     fontSize: 14,
//     color: "#666",
//     marginBottom: 10,
//   },
//   driverInfo: {
//     fontSize: 14,
//     color: "#2196F3",
//     marginBottom: 10,
//   },
//   trackBtn: {
//     backgroundColor: "#2196F3",
//     padding: 10,
//     borderRadius: 8,
//     alignItems: "center",
//   },
//   trackBtnText: {
//     color: "#fff",
//     fontWeight: "bold",
//   },
//   infoBox: {
//     marginTop: 30,
//     alignItems: "center",
//   },
//   infoText: {
//     fontSize: 16,
//     marginBottom: 5,
//   },
//   loader: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   empty: {
//     flex: 1,
//     alignItems: "center",
//     marginTop: 50,
//   },
// });
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase";
import MapView, { Marker, Polyline } from "react-native-maps";
import { router } from "expo-router";

type Booking = {
  id: string;
  patientName: string;
  emergency: string;
  status: string;
  driverId?: string;
  pickupLocation: { latitude: number; longitude: number };
  requestedAt: number;
};

type Driver = {
  name: string;
  location?: { latitude: number; longitude: number };
};

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drivers, setDrivers] = useState<Record<string, Driver>>({});

  // ==============================
  // Fetch User Bookings
  // ==============================
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "bookings"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const bookingsList: Booking[] = await Promise.all(
        snap.docs.map(async (docItem) => {
          const data = docItem.data() as Booking;
          data.id = docItem.id;

          // Fetch driver info if assigned
          if (data.driverId) {
            const driverDoc = await getDoc(doc(db, "drivers", data.driverId));
            if (driverDoc.exists()) {
              setDrivers((prev) => ({ ...prev, [data.driverId!]: driverDoc.data() as Driver }));
            }
          }

          return data;
        })
      );

      setBookings(bookingsList.sort((a, b) => b.requestedAt - a.requestedAt));
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setLoading(true);
  };

  // ==============================
  // Navigate to Tracking Screen
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
          style={styles.bookBtn}
          onPress={() => router.push("./booking")}
        >
          <Text style={styles.bookBtnText}>Book Ambulance</Text>
        </TouchableOpacity>
      </View>

      {/* Current Bookings */}
      {bookings.length > 0 ? (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={<Text style={styles.sectionHeader}>Your Bookings</Text>}
          renderItem={({ item }) => {
            const driver = item.driverId ? drivers[item.driverId] : null;

            return (
              <View style={styles.bookingCard}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Text style={styles.emergency}>Emergency: {item.emergency}</Text>
                <Text style={[styles.status, getStatusStyle(item.status)]}>
                  Status: {item.status.toUpperCase()}
                </Text>

                {/* Map Preview */}
                {item.driverId && driver?.location && (
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: driver.location.latitude,
                      longitude: driver.location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker coordinate={driver.location} title={driver.name} />
                    <Marker coordinate={item.pickupLocation} title="Pickup Location" pinColor="green" />
                    <Polyline
                      coordinates={[driver.location, item.pickupLocation]}
                      strokeColor="#e53935"
                      strokeWidth={3}
                    />
                  </MapView>
                )}

                {/* Driver Info */}
                {driver && <Text style={styles.driverInfo}>Driver: {driver.name}</Text>}

                <TouchableOpacity
                  style={styles.trackBtn}
                  onPress={() => trackBooking(item.id)}
                >
                  <Text style={styles.trackBtnText}>Track Ambulance</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.empty}>
          <Text>No ambulance requests yet.</Text>
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

// Status Color Badge
const getStatusStyle = (status: string) => {
  switch (status) {
    case "pending":
      return { color: "#FF9800" };
    case "accepted":
      return { color: "#2196F3" };
    case "on_the_way":
      return { color: "#4CAF50" };
    case "completed":
      return { color: "#9E9E9E" };
    default:
      return { color: "#000" };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8", padding: 15 },
  header: { fontSize: 32, fontWeight: "bold", color: "#e53935", textAlign: "center" },
  subHeader: { fontSize: 18, color: "#555", marginBottom: 20, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 5,
  },
  cardTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  cardText: { textAlign: "center", color: "#666", marginBottom: 15 },
  bookBtn: { backgroundColor: "#e53935", paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  sectionHeader: { fontSize: 22, fontWeight: "bold", marginBottom: 10, color: "#333" },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  patientName: { fontSize: 18, fontWeight: "bold" },
  emergency: { fontSize: 16, marginBottom: 5 },
  status: { fontSize: 16, marginBottom: 10 },
  trackBtn: { backgroundColor: "#2196F3", padding: 10, borderRadius: 8, alignItems: "center" },
  trackBtnText: { color: "#fff", fontWeight: "bold" },
  map: { width: "100%", height: 150, borderRadius: 10, marginBottom: 10 },
  driverInfo: { fontSize: 16, marginBottom: 10 },
  infoBox: { marginTop: 20, alignItems: "center" },
  infoText: { fontSize: 16, marginBottom: 5 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
});