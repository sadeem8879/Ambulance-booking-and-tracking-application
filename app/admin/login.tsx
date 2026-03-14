import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME } from "../../constants/env";
import { auth } from "../../services/firebase";
import { getUserRole } from "../../services/getUserRole";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      // Support the requested admin credentials style (username/password)
      const email =
        username === ADMIN_USERNAME && password === ADMIN_PASSWORD
          ? ADMIN_EMAIL
          : username;

      const result = await signInWithEmailAndPassword(auth, email, password);
      const role = await getUserRole(result.user.uid);

      if (role !== "admin") {
        Alert.alert("Access Denied", "You do not have admin privileges.");
        await auth.signOut();
        return;
      }

      router.replace("/admin");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Login</Text>
      <Text style={styles.subtitle}>Enter your admin credentials to continue.</Text>

      <TextInput
        placeholder="Username (e.g., sadeemadmin)"
        style={styles.input}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password (e.g., sadeem123)"
        style={styles.input}
        secureTextEntry
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/")}> 
        <Text style={styles.link}>Back to role selection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#e53935",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 25,
    color: "#555",
  },
  input: {
    width: "85%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#e53935",
    padding: 14,
    borderRadius: 10,
    width: "85%",
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    marginTop: 8,
    color: "#1565c0",
  },
});
