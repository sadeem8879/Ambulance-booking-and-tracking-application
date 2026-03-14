// import {
// View,
// Text,
// StyleSheet,
// TouchableOpacity,
// ActivityIndicator,
// Alert,
// Linking
// } from "react-native";

// import { useEffect, useState } from "react";
// import { useLocalSearchParams, router } from "expo-router";

// import {
// doc,
// getDoc,
// updateDoc
// } from "firebase/firestore";

// import { db } from "../../services/firebase";

// export default function RideStatus(){

// const { id } = useLocalSearchParams();

// const [booking,setBooking] = useState<any>(null);
// const [loading,setLoading] = useState(true);


// // Fetch booking data
// const fetchBooking = async()=>{

// try{

// if(!id) return;

// const ref = doc(db,"bookings",String(id));
// const snap = await getDoc(ref);

// if(snap.exists()){

// setBooking({
// id:snap.id,
// ...snap.data()
// });

// }

// }catch(e){
// console.log(e);
// }

// setLoading(false);

// };


// // Start Ride
// const startRide = async()=>{

// await updateDoc(doc(db,"bookings",booking.id),{
// status:"on_the_way"
// });

// Alert.alert("Ride Started");

// fetchBooking();

// };


// // Arrived
// const arrivedPatient = async()=>{

// await updateDoc(doc(db,"bookings",booking.id),{
// status:"arrived"
// });

// Alert.alert("You have arrived at patient location");

// fetchBooking();

// };


// // Complete Ride
// const completeRide = async()=>{

// await updateDoc(doc(db,"bookings",booking.id),{
// status:"completed"
// });

// Alert.alert("Ride Completed Successfully");

// router.replace("/driver/dashboard");

// };


// // Call patient
// const callPatient = ()=>{

// if(!booking.phone){
// Alert.alert("Phone number not available");
// return;
// }

// Linking.openURL(`tel:${booking.phone}`);

// };


// // Open Google Maps
// const openMap = ()=>{

// if(!booking.location){
// Alert.alert("Location not available");
// return;
// }

// const url = `https://www.google.com/maps/search/?api=1&query=${booking.location}`;

// Linking.openURL(url);

// };


// useEffect(()=>{

// fetchBooking();

// },[]);



// if(loading){

// return(

// <View style={styles.loader}>
// <ActivityIndicator size="large" color="#e53935"/>
// </View>

// );

// }



// return(

// <View style={styles.container}>

// <Text style={styles.header}>🚑 Ride Status</Text>


// <View style={styles.card}>

// <Text style={styles.label}>Patient</Text>
// <Text style={styles.value}>{booking?.patientName}</Text>

// <Text style={styles.label}>Phone</Text>
// <Text style={styles.value}>{booking?.phone}</Text>

// <Text style={styles.label}>Pickup Location</Text>
// <Text style={styles.value}>{booking?.location}</Text>

// <Text style={styles.label}>Current Status</Text>
// <Text style={styles.status}>{booking?.status}</Text>

// </View>



// {/* STATUS PROGRESS */}

// <View style={styles.progressContainer}>

// <Text style={styles.progressTitle}>Ride Progress</Text>

// <Text style={styles.progressItem}>
// {booking.status === "accepted" ? "🟡 Waiting to start ride" : ""}
// </Text>

// <Text style={styles.progressItem}>
// {booking.status === "on_the_way" ? "🚑 Driver on the way" : ""}
// </Text>

// <Text style={styles.progressItem}>
// {booking.status === "arrived" ? "📍 Driver arrived" : ""}
// </Text>

// <Text style={styles.progressItem}>
// {booking.status === "completed" ? "✅ Ride completed" : ""}
// </Text>

// </View>



// {/* ACTION BUTTONS */}

// <View style={styles.actions}>

// <TouchableOpacity
// style={styles.callBtn}
// onPress={callPatient}
// >

// <Text style={styles.btnText}>📞 Call Patient</Text>

// </TouchableOpacity>


// <TouchableOpacity
// style={styles.mapBtn}
// onPress={openMap}
// >

// <Text style={styles.btnText}>📍 Open Navigation</Text>

// </TouchableOpacity>



// {booking.status === "accepted" && (

// <TouchableOpacity
// style={styles.startBtn}
// onPress={startRide}
// >

// <Text style={styles.btnText}>Start Ride</Text>

// </TouchableOpacity>

// )}



// {booking.status === "on_the_way" && (

// <TouchableOpacity
// style={styles.arriveBtn}
// onPress={arrivedPatient}
// >

// <Text style={styles.btnText}>Mark as Arrived</Text>

// </TouchableOpacity>

// )}



// {booking.status === "arrived" && (

// <TouchableOpacity
// style={styles.completeBtn}
// onPress={completeRide}
// >

// <Text style={styles.btnText}>Complete Ride</Text>

// </TouchableOpacity>

// )}


// </View>

// </View>

// );

// }



// const styles = StyleSheet.create({

// container:{
// flex:1,
// backgroundColor:"#f5f6fa",
// padding:20
// },

// header:{
// fontSize:28,
// fontWeight:"bold",
// textAlign:"center",
// marginBottom:25,
// color:"#e53935"
// },

// card:{
// backgroundColor:"#fff",
// padding:20,
// borderRadius:15,
// marginBottom:20,
// shadowColor:"#000",
// shadowOpacity:0.1,
// shadowOffset:{width:0,height:4},
// shadowRadius:6,
// elevation:5
// },

// label:{
// fontSize:14,
// color:"#777",
// marginTop:10
// },

// value:{
// fontSize:18,
// fontWeight:"bold"
// },

// status:{
// fontSize:16,
// color:"#e53935",
// fontWeight:"bold",
// marginTop:5
// },

// progressContainer:{
// backgroundColor:"#fff",
// padding:20,
// borderRadius:15,
// marginBottom:20
// },

// progressTitle:{
// fontSize:18,
// fontWeight:"bold",
// marginBottom:10
// },

// progressItem:{
// fontSize:15,
// marginBottom:5
// },

// actions:{
// gap:12
// },

// callBtn:{
// backgroundColor:"#4CAF50",
// padding:15,
// borderRadius:10,
// alignItems:"center"
// },

// mapBtn:{
// backgroundColor:"#FF9800",
// padding:15,
// borderRadius:10,
// alignItems:"center"
// },

// startBtn:{
// backgroundColor:"#2196F3",
// padding:15,
// borderRadius:10,
// alignItems:"center"
// },

// arriveBtn:{
// backgroundColor:"#9C27B0",
// padding:15,
// borderRadius:10,
// alignItems:"center"
// },

// completeBtn:{
// backgroundColor:"#e53935",
// padding:15,
// borderRadius:10,
// alignItems:"center"
// },

// btnText:{
// color:"#fff",
// fontWeight:"bold",
// fontSize:16
// },

// loader:{
// flex:1,
// justifyContent:"center",
// alignItems:"center"
// }

// });
// 📁 app/driver/RideStatus.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from "react-native";

import { useLocalSearchParams, router } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function RideStatus() {
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ==============================
  // FETCH BOOKING
  // ==============================
  const fetchBooking = async () => {
    try {
      if (!id) return;
      const ref = doc(db, "bookings", String(id));
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setBooking({ id: snap.id, ...snap.data() });
      }
    } catch (e) {
      console.log("Fetch booking error:", e);
      Alert.alert("Error", "Unable to fetch booking details");
    }
    setLoading(false);
  };

  // ==============================
  // UPDATE RIDE STATUS
  // ==============================
  const updateStatus = async (status: string, msg: string) => {
    if (!booking) return;
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status });
      Alert.alert(msg);
      fetchBooking();
    } catch (e) {
      console.log("Update status error:", e);
      Alert.alert("Error", "Unable to update status");
    }
  };

  const startRide = () => updateStatus("on_the_way", "Ride Started");
  const arrivedPatient = () =>
    updateStatus("arrived", "You have arrived at patient location");
  const completeRide = () => {
    updateStatus("completed", "Ride Completed Successfully");
    router.replace("/driver/dashboard");
  };

  // ==============================
  // CALL & NAVIGATION
  // ==============================
  const callPatient = () => {
    if (!booking?.phone) {
      Alert.alert("Phone number not available");
      return;
    }
    Linking.openURL(`tel:${booking.phone}`);
  };

  const openMap = () => {
    if (!booking?.location) {
      Alert.alert("Location not available");
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${booking.location}`;
    Linking.openURL(url);
  };

  useEffect(() => {
    fetchBooking();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#e53935" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>🚑 Ride Status</Text>

      {/* BOOKING INFO */}
      <View style={styles.card}>
        <Text style={styles.label}>Patient</Text>
        <Text style={styles.value}>{booking?.patientName}</Text>

        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{booking?.phone}</Text>

        <Text style={styles.label}>Pickup Location</Text>
        <Text style={styles.value}>{booking?.location}</Text>

        <Text style={styles.label}>Current Status</Text>
        <Text style={styles.status}>{booking?.status}</Text>
      </View>

      {/* RIDE PROGRESS */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Ride Progress</Text>

        <Text style={styles.progressItem}>
          {booking.status === "accepted" && "🟡 Waiting to start ride"}
        </Text>
        <Text style={styles.progressItem}>
          {booking.status === "on_the_way" && "🚑 Driver on the way"}
        </Text>
        <Text style={styles.progressItem}>
          {booking.status === "arrived" && "📍 Driver arrived"}
        </Text>
        <Text style={styles.progressItem}>
          {booking.status === "completed" && "✅ Ride completed"}
        </Text>
      </View>

      {/* ACTION BUTTONS */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.callBtn} onPress={callPatient}>
          <Text style={styles.btnText}>📞 Call Patient</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
          <Text style={styles.btnText}>📍 Open Navigation</Text>
        </TouchableOpacity>

        {booking.status === "accepted" && (
          <TouchableOpacity style={styles.startBtn} onPress={startRide}>
            <Text style={styles.btnText}>Start Ride</Text>
          </TouchableOpacity>
        )}

        {booking.status === "on_the_way" && (
          <TouchableOpacity style={styles.arriveBtn} onPress={arrivedPatient}>
            <Text style={styles.btnText}>Mark as Arrived</Text>
          </TouchableOpacity>
        )}

        {booking.status === "arrived" && (
          <TouchableOpacity style={styles.completeBtn} onPress={completeRide}>
            <Text style={styles.btnText}>Complete Ride</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f5f6fa",
    padding: 20,
    alignItems: "center",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#e53935",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    color: "#777",
    marginTop: 10,
  },
  value: {
    fontSize: 18,
    fontWeight: "bold",
  },
  status: {
    fontSize: 16,
    color: "#e53935",
    fontWeight: "bold",
    marginTop: 5,
  },
  progressContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: "100%",
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  progressItem: {
    fontSize: 15,
    marginBottom: 5,
  },
  actions: {
    width: "100%",
    gap: 12,
    marginBottom: 30,
  },
  callBtn: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  mapBtn: {
    backgroundColor: "#FF9800",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  startBtn: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  arriveBtn: {
    backgroundColor: "#9C27B0",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  completeBtn: {
    backgroundColor: "#e53935",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});