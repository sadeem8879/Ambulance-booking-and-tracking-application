import * as Location from "expo-location";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../services/firebase";
import { GeoLocation } from "../driver/driverType";

export default function Booking() {
  const [patientName, setPatientName] = useState("");
  const [emergency, setEmergency] = useState("");
  const [pickupLocation, setPickupLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(false);

  // ==============================
  // GET CURRENT LOCATION
  // ==============================
  const getLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to book ambulance");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setPickupLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
      });

      Alert.alert("Location Set", "Your current location has been set as pickup point");
    } catch (error) {
      console.error("Get location error:", error);
      Alert.alert("Error", "Failed to get location");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // REQUEST AMBULANCE
  // ==============================
  const requestAmbulance = async () => {
    if (!patientName || !emergency || !pickupLocation) {
      Alert.alert("Missing Info", "Please fill all fields and set location");
      return;
    }

    if (!auth.currentUser) {
      Alert.alert("Not Logged In", "Please login first");
      return;
    }

    try {
      await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser.uid,
        patientName: patientName,
        emergency: emergency,
        pickupLocation: pickupLocation,
        status: "searching",
        requestedAt: Timestamp.now(),
      });

      Alert.alert("Success", "🚑 Ambulance request sent! Driver will be assigned soon.");

      setPatientName("");
      setEmergency("");
      setPickupLocation(null);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🚑 Book Ambulance</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Patient Name</Text>
        <TextInput
          placeholder="Enter patient name"
          style={styles.input}
          value={patientName}
          onChangeText={setPatientName}
        />

        <Text style={styles.label}>Emergency Type</Text>
        <TextInput
          placeholder="e.g., Heart attack, Accident, etc."
          style={styles.input}
          value={emergency}
          onChangeText={setEmergency}
        />

        <Text style={styles.label}>Pickup Location</Text>
        <TouchableOpacity
          style={[styles.locationBtn, pickupLocation && styles.locationSet]}
          onPress={getLocation}
          disabled={loading}
        >
          <Text style={styles.locationBtnText}>
            {loading ? "Getting Location..." : pickupLocation ? "Location Set ✓" : "Set Current Location"}
          </Text>
        </TouchableOpacity>

        {pickupLocation && (
          <Text style={styles.locationText}>
            Lat: {pickupLocation.latitude.toFixed(4)}, Lon: {pickupLocation.longitude.toFixed(4)}
          </Text>
        )}

        <TouchableOpacity style={styles.button} onPress={requestAmbulance}>
          <Text style={styles.buttonText}>Request Ambulance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:"#f4f6f8",
    justifyContent:"center",
    padding:20
  },
  header:{
    fontSize:28,
    fontWeight:"bold",
    textAlign:"center",
    marginBottom:30,
    color:"#e53935"
  },
  card:{
    backgroundColor:"#fff",
    padding:25,
    borderRadius:15,
    shadowColor:"#000",
    shadowOpacity:0.1,
    shadowOffset:{width:0,height:4},
    shadowRadius:5,
    elevation:5
  },
  label:{
    fontSize:14,
    color:"#555",
    marginBottom:5
  },
  input:{
    borderWidth:1,
    borderColor:"#ddd",
    borderRadius:10,
    padding:12,
    marginBottom:15,
    fontSize:16
  },
  locationBtn:{
    backgroundColor:"#2196F3",
    padding:12,
    borderRadius:10,
    alignItems:"center",
    marginBottom:10
  },
  locationSet:{
    backgroundColor:"#4CAF50"
  },
  locationBtnText:{
    color:"#fff",
    fontWeight:"bold"
  },
  locationText:{
    fontSize:12,
    color:"#666",
    textAlign:"center",
    marginBottom:15
  },
  button:{
    backgroundColor:"#e53935",
    padding:15,
    borderRadius:10,
    alignItems:"center",
    marginTop:10
  },
  buttonText:{
    color:"#fff",
    fontSize:16,
    fontWeight:"bold"
  }
});