import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "./services/_firebase";
import { Picker } from "@react-native-picker/picker";

export default function BookingScreen() {

  const router = useRouter();
  const params = useLocalSearchParams();

  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyType, setEmergencyType] = useState("Accident");
  const [ambulanceType, setAmbulanceType] = useState("Basic");
  const [patients, setPatients] = useState("1");
  const [notes, setNotes] = useState("");

  const handleBooking = async () => {

    if (!patientName || !phone) {
      alert("Please fill required fields");
      return;
    }

    try {

      const bookingRef = doc(collection(db, "bookings"));

      await setDoc(bookingRef, {

        patientName,
        age,
        phone,
        emergency: emergencyType,
        ambulanceType,
        patients,
        notes,

        userLat: Number(params.lat),
        userLng: Number(params.lng),

        status: "Searching",
        createdAt: new Date(),

      });

      router.push({
        pathname: "/tracking",
        params: { bookingId: bookingRef.id },
      });

    } catch (error) {
      console.log(error);
      alert("Booking failed");
    }
  };

  return (

    <ScrollView style={styles.container}>

      <Text style={styles.title}>🚑 Ambulance Booking</Text>

      {/* PATIENT INFO */}

      <Text style={styles.section}>Patient Details</Text>

      <TextInput
        placeholder="Patient Name"
        style={styles.input}
        value={patientName}
        onChangeText={setPatientName}
      />

      <TextInput
        placeholder="Age"
        keyboardType="numeric"
        style={styles.input}
        value={age}
        onChangeText={setAge}
      />

      <TextInput
        placeholder="Phone Number"
        keyboardType="phone-pad"
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
      />

      {/* EMERGENCY TYPE */}

      <Text style={styles.section}>Emergency Type</Text>

      <View style={styles.pickerBox}>
        <Picker
          selectedValue={emergencyType}
          onValueChange={(itemValue) => setEmergencyType(itemValue)}
        >

          <Picker.Item label="Accident" value="Accident" />
          <Picker.Item label="Heart Attack" value="Heart Attack" />
          <Picker.Item label="Pregnancy" value="Pregnancy" />
          <Picker.Item label="Breathing Problem" value="Breathing Problem" />
          <Picker.Item label="Stroke" value="Stroke" />
          <Picker.Item label="Other Emergency" value="Other" />

        </Picker>
      </View>

      {/* AMBULANCE TYPE */}

      <Text style={styles.section}>Ambulance Type</Text>

      <View style={styles.pickerBox}>
        <Picker
          selectedValue={ambulanceType}
          onValueChange={(itemValue) => setAmbulanceType(itemValue)}
        >

          <Picker.Item label="Basic Ambulance" value="Basic" />
          <Picker.Item label="Advanced Life Support" value="ALS" />
          <Picker.Item label="ICU Ambulance" value="ICU" />
          <Picker.Item label="Neonatal Ambulance" value="Neonatal" />

        </Picker>
      </View>

      {/* NUMBER OF PATIENTS */}

      <Text style={styles.section}>Number of Patients</Text>

      <View style={styles.pickerBox}>
        <Picker
          selectedValue={patients}
          onValueChange={(itemValue) => setPatients(itemValue)}
        >

          <Picker.Item label="1 Patient" value="1" />
          <Picker.Item label="2 Patients" value="2" />
          <Picker.Item label="3 Patients" value="3" />

        </Picker>
      </View>

      {/* NOTES */}

      <Text style={styles.section}>Additional Notes</Text>

      <TextInput
        placeholder="Describe the situation..."
        style={styles.notes}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      {/* BOOK BUTTON */}

      <TouchableOpacity
        style={styles.button}
        onPress={handleBooking}
      >
        <Text style={styles.buttonText}>Confirm Ambulance</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25
  },

  section: {
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 10
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12
  },

  pickerBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 12
  },

  notes: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    height: 80,
    marginBottom: 20
  },

  button: {
    backgroundColor: "#e53935",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 40
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  }

});
