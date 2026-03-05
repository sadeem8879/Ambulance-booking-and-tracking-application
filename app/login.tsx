import { View, Text, Button } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./services/_firebase";
import { getUserRole } from "./services/getUserRole";
import { router } from "expo-router";

export default function LoginScreen() {

  const handleLogin = async () => {

    try {

      const result = await signInWithEmailAndPassword(
        auth,
        "test@test.com",
        "123456"
      );

      const uid = result.user.uid;

      const role = await getUserRole(uid);

      if (role === "driver") {
        router.replace("/driver");
      }

      else if (role === "admin") {
        router.replace("/admin");
      }

      else {
        router.replace("/(tabs)");
      }

    } catch (error) {
      console.log(error);
    }

  };

  return (

    <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>

      <Text style={{fontSize:22, marginBottom:20}}>
        Login
      </Text>

      <Button title="Login" onPress={handleLogin} />

    </View>

  );

}
