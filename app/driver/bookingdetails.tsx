import {
View,
Text,
StyleSheet,
TouchableOpacity,
ActivityIndicator,
Linking,
Alert
} from "react-native";

import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";

import {
doc,
getDoc,
updateDoc
} from "firebase/firestore";

import { db, auth } from "../../services/firebase";

export default function BookingDetails(){

const { id } = useLocalSearchParams();

const [booking,setBooking] = useState<any>(null);
const [loading,setLoading] = useState(true);


// Fetch booking
const fetchBooking = async()=>{

try{

if(!id) return;

const ref = doc(db,"bookings",String(id));
const snapshot = await getDoc(ref);

if(snapshot.exists()){

setBooking({
id:snapshot.id,
...snapshot.data()
});

}

}catch(e){
console.log(e);
}

setLoading(false);

};


// Accept booking
const acceptBooking = async()=>{

try{

await updateDoc(doc(db,"bookings",booking.id),{
status:"accepted",
driverId:auth.currentUser?.uid
});

Alert.alert("Success","Booking Accepted");

fetchBooking();

}catch(e){
console.log(e);
}

};


// Start ride
const startRide = async()=>{

await updateDoc(doc(db,"bookings",booking.id),{
status:"on_the_way"
});

Alert.alert("Ride Started");

fetchBooking();

};


// Complete ride
const completeRide = async()=>{

await updateDoc(doc(db,"bookings",booking.id),{
status:"completed"
});

Alert.alert("Ride Completed");

router.replace("/driver/dashboard");

};


// Call patient
const callPatient = ()=>{

if(!booking.phone){
Alert.alert("No phone number");
return;
}

Linking.openURL(`tel:${booking.phone}`);

};


// Open map
const openMap = ()=>{

if(!booking.location){
Alert.alert("Location not available");
return;
}

const url = `https://www.google.com/maps/search/?api=1&query=${booking.location}`;

Linking.openURL(url);

};


useEffect(()=>{
fetchBooking();
},[]);



if(loading){
return(
<View style={styles.loader}>
<ActivityIndicator size="large" color="#e53935"/>
</View>
);
}



if(!booking){
return(
<View style={styles.loader}>
<Text>No booking found</Text>
</View>
);
}



return(

<View style={styles.container}>

<Text style={styles.header}>🚑 Booking Details</Text>


<View style={styles.card}>

<Text style={styles.label}>Patient Name</Text>
<Text style={styles.value}>{booking.patientName}</Text>

<Text style={styles.label}>Phone</Text>
<Text style={styles.value}>{booking.phone}</Text>

<Text style={styles.label}>Pickup Location</Text>
<Text style={styles.value}>{booking.location}</Text>

<Text style={styles.label}>Status</Text>
<Text style={styles.status}>{booking.status}</Text>

</View>


<View style={styles.actions}>

{/* Call */}

<TouchableOpacity
style={styles.callBtn}
onPress={callPatient}
>
<Text style={styles.btnText}>📞 Call Patient</Text>
</TouchableOpacity>


{/* Map */}

<TouchableOpacity
style={styles.mapBtn}
onPress={openMap}
>
<Text style={styles.btnText}>📍 Open Map</Text>
</TouchableOpacity>


{/* Accept */}

{booking.status === "pending" && (

<TouchableOpacity
style={styles.acceptBtn}
onPress={acceptBooking}
>
<Text style={styles.btnText}>Accept Request</Text>
</TouchableOpacity>

)}


{/* Start Ride */}

{booking.status === "accepted" && (

<TouchableOpacity
style={styles.startBtn}
onPress={startRide}
>
<Text style={styles.btnText}>Start Ride</Text>
</TouchableOpacity>

)}


{/* Complete */}

{booking.status === "on_the_way" && (

<TouchableOpacity
style={styles.completeBtn}
onPress={completeRide}
>
<Text style={styles.btnText}>Complete Ride</Text>
</TouchableOpacity>

)}

</View>

</View>

);

}



const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#f5f6fa",
padding:20
},

header:{
fontSize:28,
fontWeight:"bold",
textAlign:"center",
marginBottom:25,
color:"#e53935"
},

card:{
backgroundColor:"#fff",
padding:20,
borderRadius:15,
marginBottom:20,
shadowColor:"#000",
shadowOpacity:0.1,
shadowOffset:{width:0,height:4},
shadowRadius:6,
elevation:5
},

label:{
fontSize:14,
color:"#777",
marginTop:10
},

value:{
fontSize:18,
fontWeight:"bold",
marginTop:2
},

status:{
fontSize:16,
marginTop:5,
color:"#e53935",
fontWeight:"bold"
},

actions:{
gap:15
},

callBtn:{
backgroundColor:"#4CAF50",
padding:15,
borderRadius:10,
alignItems:"center"
},

mapBtn:{
backgroundColor:"#FF9800",
padding:15,
borderRadius:10,
alignItems:"center"
},

acceptBtn:{
backgroundColor:"#2196F3",
padding:15,
borderRadius:10,
alignItems:"center"
},

startBtn:{
backgroundColor:"#9C27B0",
padding:15,
borderRadius:10,
alignItems:"center"
},

completeBtn:{
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