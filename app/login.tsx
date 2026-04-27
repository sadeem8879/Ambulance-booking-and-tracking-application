import { router, useLocalSearchParams } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../constants/env";
import { auth } from "../services/firebase";
import { getUserRole } from "../services/getUserRole";

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

      const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      
      const actualRole = await getUserRole(result.user.uid);
      console.log("Login attempt - Email:", email, "Actual Role:", actualRole, "Role param:", roleParam);

      // If no role specified in URL, auto-redirect based on actualRole
      if (!isDriverFlow && !isUserFlow && !isAdminFlow) {
        console.log("No role specified, auto-redirecting based on actualRole", actualRole);
        if (actualRole === "driver") {
          router.replace("/driver/dashboard");
        } else if (actualRole === "admin") {
          router.replace("/admin");
        } else {
          // Default to user for unknown cases so registered users can log in without selecting role.
          router.replace("/user/dashboard");
        }
        setLoading(false);
        return;
      }

      // Strict role enforcement
      if (isDriverFlow) {
        // For drivers, just redirect - the dashboard will handle approval check
        router.replace("/driver/dashboard");
        setLoading(false);
        return;
      }

      if (isUserFlow) {
        // For users, just redirect
        router.replace("/user/dashboard");
        setLoading(false);
        return;
      }

      if (isAdminFlow) {
        // For admin, just redirect
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
      <View style={styles.card}>
        <Text style={styles.title}>🚑 Ambulance App</Text>
        <Text style={styles.subtitle}>
          {isDriverFlow
            ? "Driver login"
            : isAdminFlow
            ? "Admin login"
            : "Login to continue"}
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Email"
            style={styles.input}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Password"
            style={styles.input}
            secureTextEntry
            onChangeText={setPassword}
          />
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f5ff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8,
    color: "#e53935",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: "#666",
    textAlign: "center",
  },
  inputContainer: {
    backgroundColor: "#fafbff",
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e6e9ff",
  },
  input: {
    width: "100%",
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#e53935",
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 18,
    shadowColor: "#e539351a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    color: "#2979ff",
    fontSize: 15,
    textDecorationLine: "underline",
    marginTop: 8,
    textAlign: "center",
  },
});
