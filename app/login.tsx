import { router, useLocalSearchParams } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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

      const result = await signInWithEmailAndPassword(auth, email, password);
      const actualRole = await getUserRole(result.user.uid);

      // Ensure user is using the right entry point for their role
      if (isDriverFlow && actualRole !== "driver") {
        Alert.alert("Access Denied", "This login is for drivers only.");
        await auth.signOut();
        return;
      }

      if (isUserFlow && actualRole !== "user") {
        Alert.alert("Access Denied", "This login is for users only.");
        await auth.signOut();
        return;
      }

      if (isAdminFlow && actualRole !== "admin") {
        Alert.alert("Access Denied", "This login is for admins only.");
        await auth.signOut();
        return;
      }

      if (actualRole === "driver") {
        router.replace("/driver/dashboard");
      } else if (actualRole === "user") {
        router.replace("/user/dashboard");
      } else if (actualRole === "admin") {
        router.replace("/admin");
      } else {
        Alert.alert("Login Failed", "Your account has not been registered yet.");
        await auth.signOut();
      }
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    } finally {
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
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 8,
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
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    marginTop: 8,
    color: "#1565c0",
  },
});
