// // import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
// // import { useEffect, useState } from "react";
// // import { Button, FlatList, StyleSheet, Text, View } from "react-native";
// // import { db } from "../../services/firebase";

// // export default function DriverDashboard() {

// //   const [bookings, setBookings] = useState<any[]>([]);
// //   const [online, setOnline] = useState(false);

// //   useEffect(() => {

// //     const q = collection(db, "bookings");

// //     const unsubscribe = onSnapshot(q, (snapshot) => {

// //       const list: any[] = [];

// //       snapshot.forEach((document) => {

// //         const data = document.data();

// //         if (data.status === "Pending") {
// //           list.push({
// //             id: document.id,
// //             ...data
// //           });
// //         }

// //       });

// //       setBookings(list);

// //     });

// //     return () => unsubscribe();

// //   }, []);

// //   const acceptBooking = async (id: any) => {

// //     const ref = doc(db, "bookings", id);

// //     await updateDoc(ref, {
// //       status: "Accepted"
// //     });

// //     alert("Booking Accepted 🚑");

// //   };

// //   const toggleOnline = () => {
// //     setOnline(!online);
// //   };

// //   return (

// //     <View style={styles.container}>

// //       <Text style={styles.title}>Driver Dashboard</Text>

// //       <Button
// //         title={online ? "Go Offline" : "Go Online"}
// //         onPress={toggleOnline}
// //       />

// //       <Text style={styles.subtitle}>New Requests</Text>

// //       <FlatList
// //         data={bookings}
// //         keyExtractor={(item) => item.id}
// //         renderItem={({ item }) => (

// //           <View style={styles.card}>

// //             <Text>Patient: {item.patientName}</Text>
// //             <Text>Emergency: {item.emergency}</Text>
// //             <Text>Ambulance: {item.ambulanceType}</Text>

// //             <Button
// //               title="Accept"
// //               onPress={() => acceptBooking(item.id)}
// //             />

// //           </View>

// //         )}
// //       />

// //     </View>

// //   );

// // }

// // const styles = StyleSheet.create({

// //   container: {
// //     flex: 1,
// //     padding: 20,
// //     backgroundColor: "#fff"
// //   },

// //   title: {
// //     fontSize: 24,
// //     fontWeight: "bold",
// //     marginBottom: 20
// //   },

// //   subtitle: {
// //     fontSize: 18,
// //     marginTop: 20,
// //     marginBottom: 10
// //   },

// //   card: {
// //     padding: 15,
// //     borderWidth: 1,
// //     borderColor: "#ddd",
// //     borderRadius: 10,
// //     marginBottom: 10
// //   }

// // });
// import {
// View,
// Text,
// TouchableOpacity,
// StyleSheet,
// Switch,
// Alert
// } from "react-native";

// import { useEffect, useState } from "react";
// import { router } from "expo-router";

// import {
// collection,
// query,
// where,
// getDocs,
// updateDoc,
// doc
// } from "firebase/firestore";

// import { signOut } from "firebase/auth";

// import { db, auth } from "../../services/firebase";

// export default function DriverHome(){

// const [isAvailable,setIsAvailable] = useState(false);
// const [driverDocId,setDriverDocId] = useState<string | null>(null);


// // Fetch driver profile
// const fetchDriver = async ()=>{

// try{

// const q = query(
// collection(db,"drivers"),
// where("uid","==",auth.currentUser?.uid)
// );

// const snapshot = await getDocs(q);

// snapshot.forEach((docItem)=>{

// setDriverDocId(docItem.id);
// setIsAvailable(docItem.data().available);

// });

// }catch(e){
// console.log(e);
// }

// };


// // Toggle availability
// const toggleAvailability = async ()=>{

// if(!driverDocId) return;

// const newStatus = !isAvailable;

// setIsAvailable(newStatus);

// await updateDoc(doc(db,"drivers",driverDocId),{
// available:newStatus
// });

// };


// // Logout driver
// const logout = async ()=>{

// await signOut(auth);

// router.replace("/login");

// };


// useEffect(()=>{
// fetchDriver();
// },[]);



// return(

// <View style={styles.container}>

// <Text style={styles.header}>🚑 Driver Panel</Text>


// {/* Driver Status Card */}

// <View style={styles.card}>

// <Text style={styles.cardTitle}>
// Driver Availability
// </Text>

// <View style={styles.statusRow}>

// <Text>
// {isAvailable ? "Online" : "Offline"}
// </Text>

// <Switch
// value={isAvailable}
// onValueChange={toggleAvailability}
// />

// </View>

// </View>


// {/* Dashboard Button */}

// <TouchableOpacity
// style={styles.button}
// onPress={()=>router.push("/driver/dashboard")}
// >

// <Text style={styles.buttonText}>
// Open Driver Dashboard
// </Text>

// </TouchableOpacity>


// {/* Register Driver */}

// <TouchableOpacity
// style={styles.secondaryBtn}
// onPress={()=>router.push("/driver/registerdriver")}
// >

// <Text style={styles.secondaryText}>
// Register Driver
// </Text>

// </TouchableOpacity>


// {/* Logout */}

// <TouchableOpacity
// style={styles.logoutBtn}
// onPress={logout}
// >

// <Text style={styles.logoutText}>
// Logout
// </Text>

// </TouchableOpacity>


// </View>

// );

// }



// const styles = StyleSheet.create({

// container:{
// flex:1,
// backgroundColor:"#f5f6fa",
// padding:20,
// justifyContent:"center"
// },

// header:{
// fontSize:30,
// fontWeight:"bold",
// textAlign:"center",
// marginBottom:30,
// color:"#e53935"
// },

// card:{
// backgroundColor:"#fff",
// padding:20,
// borderRadius:15,
// marginBottom:25,
// shadowColor:"#000",
// shadowOpacity:0.1,
// shadowOffset:{width:0,height:4},
// shadowRadius:6,
// elevation:5
// },

// cardTitle:{
// fontSize:18,
// fontWeight:"bold",
// marginBottom:10
// },

// statusRow:{
// flexDirection:"row",
// justifyContent:"space-between",
// alignItems:"center"
// },

// button:{
// backgroundColor:"#e53935",
// padding:15,
// borderRadius:10,
// alignItems:"center",
// marginBottom:15
// },

// buttonText:{
// color:"#fff",
// fontWeight:"bold",
// fontSize:16
// },

// secondaryBtn:{
// borderWidth:2,
// borderColor:"#e53935",
// padding:15,
// borderRadius:10,
// alignItems:"center",
// marginBottom:15
// },

// secondaryText:{
// color:"#e53935",
// fontWeight:"bold"
// },

// logoutBtn:{
// backgroundColor:"#333",
// padding:15,
// borderRadius:10,
// alignItems:"center"
// },

// logoutText:{
// color:"#fff",
// fontWeight:"bold"
// }

// });
import {
View,
Text,
StyleSheet,
TouchableOpacity,
ActivityIndicator,
Alert,
SafeAreaView
} from "react-native";

import { useEffect, useState } from "react";
import { router } from "expo-router";

import { auth, db } from "../../services/firebase";

import {
doc,
getDoc,
updateDoc
} from "firebase/firestore";

import {
onAuthStateChanged,
signOut
} from "firebase/auth";

// IMPORTANT: import both functions
import { startDriverTracking, stopDriverTracking } from "./tracklocation";

export default function DriverIndex(){

const [loading,setLoading] = useState(true);
const [driver,setDriver] = useState<any>(null);


// ==============================
// CHECK DRIVER PROFILE
// ==============================

const checkDriverProfile = async (uid:string)=>{

try{

const ref = doc(db,"drivers",uid);
const snap = await getDoc(ref);

if(!snap.exists()){

router.replace("/driver/registerdriver");
return;

}

const data:any = snap.data();

setDriver({
id:snap.id,
...data
});

}catch(err){

console.log("Driver profile error:",err);

}

setLoading(false);

};


// ==============================
// AUTH LISTENER
// ==============================

useEffect(()=>{

const unsubscribe = onAuthStateChanged(auth,(user)=>{

if(!user){

router.replace("/login");
return;

}

checkDriverProfile(user.uid);

});

return ()=>unsubscribe();

},[]);


// ==============================
// GO ONLINE
// ==============================

const goOnline = async()=>{

if(!driver) return;

try{

await updateDoc(doc(db,"drivers",driver.id),{
online:true,
lastOnline:Date.now()
});

// Start GPS tracking
await startDriverTracking(driver.id);

setDriver((prev:any)=>({
...prev,
online:true
}));

Alert.alert("Status Updated","You are now ONLINE");

}catch(e){

console.log("Online error:",e);

}

};


// ==============================
// GO OFFLINE
// ==============================

const goOffline = async()=>{

if(!driver) return;

try{

await updateDoc(doc(db,"drivers",driver.id),{
online:false
});

// Stop GPS tracking
stopDriverTracking();

setDriver((prev:any)=>({
...prev,
online:false
}));

Alert.alert("Status Updated","You are now OFFLINE");

}catch(e){

console.log("Offline error:",e);

}

};


// ==============================
// OPEN DASHBOARD
// ==============================

const openDashboard = ()=>{

router.push("/driver/dashboard");

};


// ==============================
// LOGOUT
// ==============================

const logout = async()=>{

try{

stopDriverTracking();

await signOut(auth);

router.replace("/login");

}catch(err){

console.log("Logout error:",err);

}

};


// ==============================
// LOADING SCREEN
// ==============================

if(loading){

return(

<View style={styles.loader}>

<ActivityIndicator size="large" color="#e53935"/>

<Text style={{marginTop:10}}>
Checking driver profile...
</Text>

</View>

);

}


// ==============================
// WAITING FOR ADMIN APPROVAL
// ==============================

if(driver && !driver.approved){

return(

<SafeAreaView style={styles.container}>

<Text style={styles.header}>
🚑 Driver Approval Pending
</Text>

<View style={styles.card}>

<Text style={styles.text}>
Your driver account is under review by admin.
</Text>

<Text style={styles.text}>
You will be able to accept ambulance requests once approved.
</Text>

</View>

<TouchableOpacity
style={styles.logoutBtn}
onPress={logout}
>

<Text style={styles.btnText}>
Logout
</Text>

</TouchableOpacity>

</SafeAreaView>

);

}


// ==============================
// MAIN DRIVER PANEL
// ==============================

return(

<SafeAreaView style={styles.container}>

<Text style={styles.header}>
🚑 Driver Panel
</Text>


<View style={styles.card}>

<Text style={styles.name}>
Welcome {driver?.name || "Driver"}
</Text>

<Text style={styles.status}>
Status: {driver?.online ? "🟢 Online" : "🔴 Offline"}
</Text>

</View>


<View style={styles.actions}>

{!driver?.online && (

<TouchableOpacity
style={styles.onlineBtn}
onPress={goOnline}
>

<Text style={styles.btnText}>
Go Online
</Text>

</TouchableOpacity>

)}

{driver?.online && (

<TouchableOpacity
style={styles.offlineBtn}
onPress={goOffline}
>

<Text style={styles.btnText}>
Go Offline
</Text>

</TouchableOpacity>

)}

<TouchableOpacity
style={styles.dashboardBtn}
onPress={openDashboard}
>

<Text style={styles.btnText}>
Open Dashboard
</Text>

</TouchableOpacity>

<TouchableOpacity
style={styles.logoutBtn}
onPress={logout}
>

<Text style={styles.btnText}>
Logout
</Text>

</TouchableOpacity>

</View>

</SafeAreaView>

);

}


// ==============================
// STYLES
// ==============================

const styles = StyleSheet.create({

container:{
flex:1,
justifyContent:"center",
alignItems:"center",
backgroundColor:"#f5f6fa",
padding:20
},

header:{
fontSize:30,
fontWeight:"bold",
color:"#e53935",
marginBottom:30
},

card:{
backgroundColor:"#fff",
padding:25,
borderRadius:15,
width:"100%",
alignItems:"center",
marginBottom:30,
shadowColor:"#000",
shadowOpacity:0.1,
shadowOffset:{width:0,height:4},
shadowRadius:6,
elevation:5
},

name:{
fontSize:22,
fontWeight:"bold"
},

status:{
marginTop:10,
fontSize:16
},

text:{
fontSize:16,
textAlign:"center",
marginBottom:10
},

actions:{
width:"100%",
gap:15
},

onlineBtn:{
backgroundColor:"#4CAF50",
padding:15,
borderRadius:10,
alignItems:"center"
},

offlineBtn:{
backgroundColor:"#FF9800",
padding:15,
borderRadius:10,
alignItems:"center"
},

dashboardBtn:{
backgroundColor:"#2196F3",
padding:15,
borderRadius:10,
alignItems:"center"
},

logoutBtn:{
backgroundColor:"#e53935",
padding:15,
borderRadius:10,
alignItems:"center"
},

btnText:{
color:"#fff",
fontWeight:"bold",
fontSize:16
},

loader:{
flex:1,
justifyContent:"center",
alignItems:"center"
}

});