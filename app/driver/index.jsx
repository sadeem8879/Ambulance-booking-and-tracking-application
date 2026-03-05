import { View, Text, StyleSheet } from "react-native";

export default function DriverDashboard() {

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        🚑 Driver Dashboard
      </Text>

      <Text style={styles.subtitle}>
        Waiting for ambulance request...
      </Text>

    </View>

  );
}

const styles = StyleSheet.create({

  container:{
    flex:1,
    justifyContent:"center",
    alignItems:"center"
  },

  title:{
    fontSize:26,
    fontWeight:"bold"
  },

  subtitle:{
    fontSize:16,
    marginTop:10
  }

});
