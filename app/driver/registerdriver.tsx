import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../services/firebase";
import { doc, setDoc } from "firebase/firestore";
import { router } from "expo-router";

export default function RegisterDriver() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ambulance, setAmbulance] = useState("");
  const [license, setLicense] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ==============================
  // REGISTRATION FUNCTION
  // ==============================
  const register = async () => {
    // Validation
    if (!name || !email || !phone || !ambulance || !license || !password) {
      Alert.alert("All fields are required");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Create Firebase Auth user
      const res = await createUserWithEmailAndPassword(auth, email, password);

      // 2️⃣ Save driver profile in Firestore
      await setDoc(doc(db, "drivers", res.user.uid), {
        name,
        email,
        phone,
        ambulanceNumber: ambulance,
        licenseNumber: license,

        // 🚨 Core fields for Uber-style system
        approved: false,          // admin approval pending
        online: false,            // driver offline initially
        currentTripId: null,      // no trips assigned yet
        location: { latitude: 0, longitude: 0 }, // initial GPS setup
        role: "driver",
        createdAt: Date.now(),
      });

      Alert.alert(
        "Registration Submitted",
        "Your account is under admin review. Wait for approval."
      );

      router.replace("/login");
    } catch (e: any) {
      console.log("Driver registration error:", e);
      Alert.alert("Registration Error", e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>🚑 Driver Registration</Text>
        <Text style={styles.subtitle}>
          Join our ambulance network and start receiving requests!
        </Text>

        <TextInput
          placeholder="Full Name"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Phone Number"
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TextInput
          placeholder="Ambulance Number"
          style={styles.input}
          value={ambulance}
          onChangeText={setAmbulance}
        />

        <TextInput
          placeholder="License Number"
          style={styles.input}
          value={license}
          onChangeText={setLicense}
        />

        <TextInput
          placeholder="Password"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={register}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Submitting..." : "Register"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          After registration, admin approval is required. Once approved, you
          can go online, receive requests, and start trips.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6f8fb",
    padding: 25,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#e53935",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 25,
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  button: {
    width: "100%",
    backgroundColor: "#e53935",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  note: {
    textAlign: "center",
    marginTop: 15,
    fontSize: 14,
    color: "#777",
    paddingHorizontal: 10,
  },
});