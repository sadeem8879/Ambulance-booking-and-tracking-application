import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from "../services/firebase";
import { getUserRole } from "../services/getUserRole";

export default function Index() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }

      try {
        // Ensure Firestore auth token is fresh before initial role check
        try {
          await user.getIdToken(true);
        } catch (tokenError) {
          console.warn("⚠️ Token refresh failed during startup", tokenError);
        }

        const role = await getUserRole(user.uid);
        if (role === "driver") {
          router.replace("/driver/dashboard");
          return;
        } else if (role === "user") {
          router.replace("/user/dashboard");
          return;
        } else if (role === "admin") {
          router.replace("/admin");
          return;
        }

        // Fallback to user for legacy accounts with auth-only registration.
        router.replace("/user/dashboard");
        return;
      } catch (err) {
        console.error("❌ Role routing error on app launch", err);
        router.replace("/login");
      } finally {
        setCheckingAuth(false);
      }
    });

    return unsubscribe;
  }, []);

  if (checkingAuth) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e53935" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ambulance Dispatch</Text>
        <Text style={styles.subtitle}>Fast, secure and life-saving logistics for users, drivers, and admins.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.brandRow}>
          <Ionicons name="heart" size={24} color="#e53935" />
          <Text style={styles.cardTitle}>Choose Your Role</Text>
        </View>
        <Text style={styles.cardText}>Designed for fast response, clear actions, and professional control.</Text>

        <TouchableOpacity style={styles.button} onPress={() => router.push("/login?role=user")}> 
          <Text style={styles.buttonText}>Patient / User</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push("/login?role=driver")}> 
          <Text style={styles.buttonText}>Ambulance Driver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.adminButton]} onPress={() => router.push("/admin/login")}> 
          <Text style={styles.buttonText}>Admin</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>24/7 support · real-time location · secure Firestore rules</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#e53935",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 24,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#e53935",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 30,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#e539351a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  adminButton: {
    backgroundColor: "#2c3e50",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    width: "100%",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  footer: {
    marginTop: 26,
    color: "#666",
    fontSize: 12,
    textAlign: "center",
  },
});
