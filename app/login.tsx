import { router, useLocalSearchParams } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../constants/env";
import { auth } from "../services/firebase";
import { getUserRole } from "../services/getUserRole";

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function Login() {
  const { role: roleParam } = useLocalSearchParams();
  const role = typeof roleParam === "string" ? roleParam : undefined;
  const isDriverFlow = role === "driver";
  const isUserFlow = role === "user";
  const isAdminFlow = role === "admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      // Admin login bypass
      if (isAdminFlow && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        router.replace("/admin");
        setLoading(false);
        return;
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // ✅ Refresh user token to ensure auth state is fully synced
      // This fixes the issue where Firestore queries fail after logout/login
      try {
        await result.user.getIdToken(true); // Force token refresh
      } catch (e) {
        console.log("⚠️ Token refresh skipped:", e);
      }
      
      // Small delay to ensure Firestore query is in sync with auth state
      await delay(300);
      
      const actualRole = await getUserRole(result.user.uid);

      // Strict role enforcement
      if (isDriverFlow) {
        if (actualRole !== "driver") {
          Alert.alert("Access Denied", "This login is for drivers only.");
          await auth.signOut();
          setLoading(false);
          return;
        }
        router.replace("/driver/dashboard");
        setLoading(false);
        return;
      }

      if (isUserFlow) {
        if (actualRole !== "user") {
          Alert.alert("Access Denied", "This login is for users only.");
          await auth.signOut();
          setLoading(false);
          return;
        }
        router.replace("/user/dashboard");
        setLoading(false);
        return;
      }

      if (isAdminFlow) {
        if (actualRole !== "admin") {
          Alert.alert("Access Denied", "This login is for admins only.");
          await auth.signOut();
          setLoading(false);
          return;
        }
        router.replace("/admin");
        setLoading(false);
        return;
      }

      Alert.alert("Login Failed", "Your account has not been registered yet.");
      await auth.signOut();
      setLoading(false);
    } catch (err: any) {
      let errorMessage = "Login Failed";
      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please check your email or register first.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email format. Please enter a valid email address.";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled. Please contact support.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection.";
      } else {
        errorMessage = "Login failed. Please try again.";
      }
      Alert.alert("Login Failed", errorMessage);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚑 Ambulance App</Text>
      <Text style={styles.subtitle}>
        {isDriverFlow
          ? "Driver login"
          : isAdminFlow
          ? "Admin login"
          : "Login to continue"}
      </Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "Logging in..." : "Login"}</Text>
      </TouchableOpacity>

      {isAdminFlow ? (
        <TouchableOpacity onPress={() => router.push("/")}> 
          <Text style={styles.link}>Back to role selection</Text>
        </TouchableOpacity>
      ) : (
        <>
          {(!role || isUserFlow) && (
            <TouchableOpacity onPress={() => router.push("/registeruser")}>
              <Text style={styles.link}>Create User Account</Text>
            </TouchableOpacity>
          )}

          {(!role || isDriverFlow) && (
            <TouchableOpacity onPress={() => router.push("/driver/registerdriver")}> 
              <Text style={styles.link}>Register Ambulance Provider</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.push("/")}> 
            <Text style={styles.link}>Back to role selection</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#e53935",
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: "#666",
    textAlign: "center",
  },
  input: {
    width: "90%",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: "#fff",
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    backgroundColor: "#e53935",
    padding: 16,
    borderRadius: 12,
    width: "90%",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    color: "#2196f3",
    fontSize: 16,
    textDecorationLine: "underline",
    marginBottom: 10,
  },
});
