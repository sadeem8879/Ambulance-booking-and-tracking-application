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
        const role = await getUserRole(user.uid);
        if (role === "driver") {
          router.replace("/driver/dashboard");
        } else if (role === "user") {
          router.replace("/user/dashboard");
        } else if (role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/login");
        }
      } catch (err) {
        router.replace("/login");
      }
    });

    return unsubscribe;
  }, []);

  if (checkingAuth) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Ambulance App</Text>
      <Text style={styles.subtitle}>Choose your role to continue</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/login?role=user")}
      >
        <Text style={styles.buttonText}>I&apos;m a Patient / User</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/login?role=driver")}
      >
        <Text style={styles.buttonText}>I&apos;m an Ambulance Driver</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/admin/login")}
      >
        <Text style={styles.buttonText}>I&apos;m an Admin</Text>
      </TouchableOpacity>
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
  button: {
    backgroundColor: "#e53935",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    marginBottom: 14,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
