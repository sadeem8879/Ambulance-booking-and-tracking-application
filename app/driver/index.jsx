import { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, FlatList } from "react-native";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../services/_firebase";

export default function DriverDashboard() {

  const [bookings, setBookings] = useState<any[]>([]);
  const [online, setOnline] = useState(false);

  useEffect(() => {

    const q = collection(db, "bookings");

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const list: any[] = [];

      snapshot.forEach((doc) => {

        const data = doc.data();

        if (data.status === "Pending") {
          list.push({
            id: doc.id,
            ...data
          });
        }

      });

      setBookings(list);

    });

    return () => unsubscribe();

  }, []);

  const acceptBooking = async (id: string) => {

    const ref = doc(db, "bookings", id);

    await updateDoc(ref, {
      status: "Accepted"
    });

    alert("Booking Accepted 🚑");

  };

  const toggleOnline = () => {
    setOnline(!online);
  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>Driver Dashboard</Text>

      <Button
        title={online ? "Go Offline" : "Go Online"}
        onPress={toggleOnline}
      />

      <Text style={styles.subtitle}>New Requests</Text>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (

          <View style={styles.card}>

            <Text>Patient: {item.patientName}</Text>

            <Text>Emergency: {item.emergency}</Text>

            <Text>Ambulance: {item.ambulanceType}</Text>

            <Button
              title="Accept"
              onPress={() => acceptBooking(item.id)}
            />

          </View>

        )}
      />

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20
  },

  subtitle: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 10
  },

  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 10
  }

});
