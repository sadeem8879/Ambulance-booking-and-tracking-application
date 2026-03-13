import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../../services/firebase";

export default function Booking() {

  const [patientName, setPatientName] = useState("");
  const [location, setLocation] = useState("");

  const requestAmbulance = async () => {

    if (!patientName || !location) {
      Alert.alert("Missing Info", "Please fill all fields");
      return;
    }

    try {

      await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser?.uid,
        patientName: patientName,
        location: location,
        status: "pending",
        createdAt: new Date()
      });

      Alert.alert("Success", "🚑 Ambulance request sent!");

      setPatientName("");
      setLocation("");

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

        <Text style={styles.label}>Pickup Location</Text>
        <TextInput
          placeholder="Enter location"
          style={styles.input}
          value={location}
          onChangeText={setLocation}
        />

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