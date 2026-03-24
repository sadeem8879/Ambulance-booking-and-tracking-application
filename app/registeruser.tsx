import { Ionicons } from "@expo/vector-icons"; // Assuming this is available
import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../services/firebase";

export default function RegisterUser() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value: string) => {
    // Basic email format and at least 3-char TLD (reject abc@gmail.co as requested)
    return /^[^\s@]+@[^\s@]+\.[A-Za-z]{3,}$/.test(value);
  };

  const isValidPhone = (value: string) => {
    return /^\d{10}$/.test(value);
  };

  const register = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (!isValidEmail(email.trim())) {
      Alert.alert("Invalid Email", "Enter a valid email address (e.g. user@example.com)");
      return;
    }

    if (!isValidPhone(phone.trim())) {
      Alert.alert("Invalid Phone", "Enter a valid 10-digit phone number");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, "users", res.user.uid), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: "user",
        createdAt: Date.now(),
      });
      Alert.alert("Success", "User Registered Successfully!");
      router.replace("/login");
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="person-add" size={60} color="#e53935" />
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Join us to book ambulances quickly</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#666" style={styles.icon} />
            <TextInput
              placeholder="Full Name"
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#666" style={styles.icon} />
            <TextInput
              placeholder="Email Address"
              style={styles.input}
              value={email}
              onChangeText={(value) => setEmail(value.trim().toLowerCase())}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color="#666" style={styles.icon} />
            <TextInput
              placeholder="Phone Number (10 digits)"
              style={styles.input}
              value={phone}
              onChangeText={(value) => {
                const cleaned = value.replace(/\D/g, "");
                if (cleaned.length <= 10) {
                  setPhone(cleaned);
                }
              }}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.icon} />
            <TextInput
              placeholder="Password"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={register}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Registering..." : "Create Account"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e53935",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#e53935",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    textAlign: "center",
    color: "#1565c0",
    fontSize: 16,
  },
});

