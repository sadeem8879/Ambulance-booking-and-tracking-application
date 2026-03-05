import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { db } from "./services/_firebase";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import * as Location from "expo-location";

export default function DriverScreen() {

  const [requests, setRequests] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<any>(null);

  useEffect(() => {

    const unsubscribe = onSnapshot(
      collection(db, "ambulanceRequests"),
      (snapshot) => {

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        setRequests(data);
      }
    );

    return () => unsubscribe();

  }, []);

  // 📍 Get driver live location
  useEffect(() => {

    const getLocation = async () => {

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Location permission denied");
        return;
      }

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5
        },
        (location) => {
          setCurrentLocation(location.coords);
        }
      );

    };

    getLocation();

  }, []);

  const acceptRequest = async (id: string) => {

    const ref = doc(db, "ambulanceRequests", id);

    await updateDoc(ref, {
      status: "Driver Assigned",
      driverLat: currentLocation?.latitude,
      driverLng: currentLocation?.longitude
    });

  };

  const renderItem = ({ item }: any) => (

    <View style={styles.card}>

      <Text style={styles.name}>Patient: {item.name}</Text>

      <Text style={styles.type}>Emergency: {item.type}</Text>

      <Text>Status: {item.status}</Text>

      {item.status === "Waiting for Ambulance" && (

        <TouchableOpacity
          style={styles.button}
          onPress={() => acceptRequest(item.id)}
        >
          <Text style={styles.btnText}>Accept Request</Text>
        </TouchableOpacity>

      )}

    </View>

  );

  return (

    <View style={styles.container}>

      <Text style={styles.title}>🚑 Driver Dashboard</Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5"
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20
  },

  card: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    elevation: 3
  },

  name: {
    fontSize: 18,
    fontWeight: "bold"
  },

  type: {
    color: "red",
    marginBottom: 10
  },

  button: {
    backgroundColor: "#2ecc71",
    padding: 10,
    borderRadius: 8,
    marginTop: 10
  },

  btnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold"
  }

});
