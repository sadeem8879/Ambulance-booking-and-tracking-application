// // import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
// // import { router } from "expo-router";

// // export default function Dashboard() {
// //     return (
// //         <View style={styles.container}>

// //             {/* Header */}
// //             <Text style={styles.header}>🚑 Ambulance App</Text>
// //             <Text style={styles.subHeader}>User Dashboard</Text>

// //             {/* Card */}
// //             <View style={styles.card}>
// //                 <Text style={styles.cardTitle}>Emergency Ambulance</Text>
// //                 <Text style={styles.cardText}>
// //                     Quickly request an ambulance near you in case of emergency.
// //                 </Text>

// //                 <TouchableOpacity
// //                     onPress={() => router.push("./booking")}
// //                     style={{ marginTop: 20 }}
// //                 >
// //                     <Text>Book Ambulance</Text>
// //                 </TouchableOpacity>
// //             </View>

// //             {/* Info Section */}
// //             <View style={styles.infoBox}>
// //                 <Text style={styles.infoText}>✔ Fast Response</Text>
// //                 <Text style={styles.infoText}>✔ Nearby Drivers</Text>
// //                 <Text style={styles.infoText}>✔ Live Tracking</Text>
// //             </View>

// //         </View>
// //     );
// // }

// // const styles = StyleSheet.create({
// //     container: {
// //         flex: 1,
// //         backgroundColor: "#f4f6f8",
// //         alignItems: "center",
// //         justifyContent: "center",
// //         padding: 20,
// //     },

// //     header: {
// //         fontSize: 32,
// //         fontWeight: "bold",
// //         color: "#e53935",
// //     },

// //     subHeader: {
// //         fontSize: 18,
// //         color: "#555",
// //         marginBottom: 30,
// //     },

// //     card: {
// //         backgroundColor: "#fff",
// //         width: "100%",
// //         padding: 25,
// //         borderRadius: 15,
// //         shadowColor: "#000",
// //         shadowOpacity: 0.1,
// //         shadowOffset: { width: 0, height: 4 },
// //         shadowRadius: 5,
// //         elevation: 5,
// //         alignItems: "center",
// //     },

// //     cardTitle: {
// //         fontSize: 20,
// //         fontWeight: "bold",
// //         marginBottom: 10,
// //     },

// //     cardText: {
// //         textAlign: "center",
// //         color: "#666",
// //         marginBottom: 20,
// //     },

// //     button: {
// //         backgroundColor: "#e53935",
// //         paddingVertical: 12,
// //         paddingHorizontal: 30,
// //         borderRadius: 10,
// //     },

// //     buttonText: {
// //         color: "#fff",
// //         fontSize: 16,
// //         fontWeight: "bold",
// //     },

// //     infoBox: {
// //         marginTop: 30,
// //         alignItems: "center",
// //     },

// //     infoText: {
// //         fontSize: 16,
// //         color: "#444",
// //         marginVertical: 3,
// //     },
// // });
// import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { useState } from "react";
// import { collection, addDoc } from "firebase/firestore";
// import { db, auth } from "../../services/firebase";

// export default function RegisterDriver(){

// const [name,setName] = useState("");
// const [vehicle,setVehicle] = useState("");
// const [phone,setPhone] = useState("");

// const registerDriver = async ()=>{

// if(!name || !vehicle || !phone){
// Alert.alert("Fill all fields");
// return;
// }

// try{

// await addDoc(collection(db,"drivers"),{
// uid:auth.currentUser?.uid,
// name,
// vehicle,
// phone,
// available:true,
// createdAt:new Date()
// });

// Alert.alert("Success","Driver Registered");

// }catch(e){
// console.log(e);
// Alert.alert("Error");
// }

// };

// return(

// <View style={styles.container}>

// <Text style={styles.header}>🚑 Driver Registration</Text>

// <View style={styles.card}>

// <TextInput
// placeholder="Driver Name"
// style={styles.input}
// value={name}
// onChangeText={setName}
// />

// <TextInput
// placeholder="Ambulance Number"
// style={styles.input}
// value={vehicle}
// onChangeText={setVehicle}
// />

// <TextInput
// placeholder="Phone Number"
// style={styles.input}
// value={phone}
// onChangeText={setPhone}
// />

// <TouchableOpacity style={styles.button} onPress={registerDriver}>
// <Text style={styles.buttonText}>Register Driver</Text>
// </TouchableOpacity>

// </View>

// </View>

// );

// }

// const styles = StyleSheet.create({

// container:{
// flex:1,
// justifyContent:"center",
// backgroundColor:"#f5f5f5",
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
// padding:25,
// borderRadius:15,
// elevation:5
// },

// input:{
// borderWidth:1,
// borderColor:"#ddd",
// borderRadius:10,
// padding:12,
// marginBottom:15
// },

// button:{
// backgroundColor:"#e53935",
// padding:15,
// borderRadius:10,
// alignItems:"center"
// },

// buttonText:{
// color:"#fff",
// fontWeight:"bold"
// }

// });
import {
View,
Text,
FlatList,
TouchableOpacity,
StyleSheet,
ActivityIndicator,
RefreshControl
} from "react-native";

import { useEffect, useState } from "react";

import {
collection,
getDocs,
doc,
updateDoc
} from "firebase/firestore";

import { db, auth } from "../../services/firebase";

export default function DriverDashboard(){

const [bookings,setBookings] = useState<any[]>([]);
const [loading,setLoading] = useState(true);
const [refreshing,setRefreshing] = useState(false);


// Fetch bookings from Firestore
const fetchBookings = async ()=>{

try{

const snapshot = await getDocs(collection(db,"bookings"));

const list:any[] = [];

snapshot.forEach((docItem)=>{
list.push({
id:docItem.id,
...docItem.data()
});
});

setBookings(list);

}catch(e){
console.log("Error fetching bookings",e);
}

setLoading(false);
setRefreshing(false);

};


// Initial load
useEffect(()=>{
fetchBookings();
},[]);


// Accept Booking
const acceptBooking = async(id:string)=>{

await updateDoc(doc(db,"bookings",id),{
status:"accepted",
driverId:auth.currentUser?.uid
});

fetchBookings();

};


// Driver on the way
const startRide = async(id:string)=>{

await updateDoc(doc(db,"bookings",id),{
status:"on_the_way"
});

fetchBookings();

};


// Complete ride
const completeRide = async(id:string)=>{

await updateDoc(doc(db,"bookings",id),{
status:"completed"
});

fetchBookings();

};


// Pull to refresh
const onRefresh = ()=>{
setRefreshing(true);
fetchBookings();
};


if(loading){
return(
<View style={styles.loader}>
<ActivityIndicator size="large" color="#e53935"/>
</View>
);
}


return(

<View style={styles.container}>

<Text style={styles.header}>🚑 Driver Dashboard</Text>

<FlatList
data={bookings}
keyExtractor={(item)=>item.id}
refreshControl={
<RefreshControl
refreshing={refreshing}
onRefresh={onRefresh}
/>
}

ListEmptyComponent={()=>(

<View style={styles.empty}>
<Text>No ambulance requests yet</Text>
</View>

)}

renderItem={({item})=>(

<View style={styles.card}>

<Text style={styles.patient}>
Patient: {item.patientName}
</Text>

<Text style={styles.info}>
📍 Location: {item.location}
</Text>

<Text style={styles.info}>
📊 Status: {item.status}
</Text>


{/* Accept Button */}

{item.status === "pending" && (

<TouchableOpacity
style={styles.acceptBtn}
onPress={()=>acceptBooking(item.id)}
>

<Text style={styles.btnText}>
Accept Request
</Text>

</TouchableOpacity>

)}


{/* On The Way */}

{item.status === "accepted" && (

<TouchableOpacity
style={styles.startBtn}
onPress={()=>startRide(item.id)}
>

<Text style={styles.btnText}>
Start Ride
</Text>

</TouchableOpacity>

)}


{/* Complete */}

{item.status === "on_the_way" && (

<TouchableOpacity
style={styles.completeBtn}
onPress={()=>completeRide(item.id)}
>

<Text style={styles.btnText}>
Complete Ride
</Text>

</TouchableOpacity>

)}

</View>

)}

/>

</View>

);

}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#f4f6f8",
padding:15
},

header:{
fontSize:26,
fontWeight:"bold",
marginBottom:15,
color:"#e53935"
},

card:{
backgroundColor:"#fff",
padding:20,
borderRadius:15,
marginBottom:15,
shadowColor:"#000",
shadowOpacity:0.1,
shadowOffset:{width:0,height:4},
shadowRadius:5,
elevation:5
},

patient:{
fontSize:18,
fontWeight:"bold",
marginBottom:5
},

info:{
fontSize:14,
marginBottom:3
},

acceptBtn:{
backgroundColor:"#4CAF50",
padding:10,
borderRadius:8,
marginTop:10,
alignItems:"center"
},

startBtn:{
backgroundColor:"#FF9800",
padding:10,
borderRadius:8,
marginTop:10,
alignItems:"center"
},

completeBtn:{
backgroundColor:"#2196F3",
padding:10,
borderRadius:8,
marginTop:10,
alignItems:"center"
},

btnText:{
color:"#fff",
fontWeight:"bold"
},

empty:{
flex:1,
alignItems:"center",
marginTop:100
},

loader:{
flex:1,
justifyContent:"center",
alignItems:"center"
}

});