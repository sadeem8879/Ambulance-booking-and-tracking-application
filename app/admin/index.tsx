import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Booking, Driver } from "../../lib/driverTypes";
import { db } from "../../services/firebase";

export default function AdminPanel() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // ==============================
  // FETCH DRIVERS
  // ==============================
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "drivers"), (snap) => {
      const driversList: Driver[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Driver[];
      setDrivers(driversList);
    });

    return unsubscribe;
  }, []);

  // ==============================
  // FETCH PENDING BOOKINGS
  // ==============================
  useEffect(() => {
    const q = query(
      collection(db, "bookings"),
      where("status", "==", "searching")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const bookingsList: Booking[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setBookings(bookingsList);
    });

    return unsubscribe;
  }, []);

  // ==============================
  // APPROVE DRIVER
  // ==============================
  const approveDriver = async (driverId: string) => {
    try {
      await updateDoc(doc(db, "drivers", driverId), {
        approved: true,
      });
      Alert.alert("Success", "Driver approved!");
    } catch (error) {
      console.error("Approve driver error:", error);
      Alert.alert("Error", "Failed to approve driver");
    }
  };

  // ==============================
  // ASSIGN BOOKING TO DRIVER
  // ==============================
  const assignBooking = async (bookingId: string, driverId: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "accepted",
        driverId: driverId,
        assignedBy: "admin",
      });
      Alert.alert("Success", "Booking assigned to driver!");
    } catch (error) {
      console.error("Assign booking error:", error);
      Alert.alert("Error", "Failed to assign booking");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.header}>Admin Dashboard</Text>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>Drivers</Text>
        <FlatList
          data={drivers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text>Phone: {item.phone}</Text>
              <Text>Approved: {item.approved ? "Yes" : "No"}</Text>
              <Text>Online: {item.online ? "Yes" : "No"}</Text>
              {!item.approved && (
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => approveDriver(item.id)}
                >
                  <Text style={styles.btnText}>Approve Driver</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          style={{ marginBottom: 20 }}
        />
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>Pending Bookings</Text>
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.patientName}</Text>
              <Text>Emergency: {item.emergency}</Text>
              {item.pickupLocation && typeof item.pickupLocation.latitude === 'number' && typeof item.pickupLocation.longitude === 'number' ? (
                <Text>Location: {item.pickupLocation.latitude.toFixed(3)}, {item.pickupLocation.longitude.toFixed(3)}</Text>
              ) : (
                <Text>Location: Not available</Text>
              )}
              <Text style={styles.assignText}>Assign to Driver:</Text>
              {drivers.filter(d => d.approved && d.online).map(driver => (
                <TouchableOpacity
                  key={driver.id}
                  style={styles.assignBtn}
                  onPress={() => assignBooking(item.id, driver.id)}
                >
                  <Text style={styles.btnText}>{driver.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f6fa",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#e53935",
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: "#f0f4f8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
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
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
  approveBtn: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  assignText: {
    fontSize: 16,
    marginTop: 10,
    fontWeight: "bold",
  },
  assignBtn: {
    backgroundColor: "#2196F3",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 5,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
