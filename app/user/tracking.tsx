import React, { useEffect, useState } from "react";
import {
 View,
 Text,
 StyleSheet,
 ActivityIndicator,
 TouchableOpacity
} from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function Tracking({ bookingId }: { bookingId: string }) {

const [driver,setDriver] = useState<any>(null);
const [status,setStatus] = useState("searching");
const [loading,setLoading] = useState(true);

useEffect(()=>{

if(!bookingId) return;

const ref = doc(db,"bookings",bookingId);

const unsub = onSnapshot(ref,(snap)=>{

const data = snap.data();

if(data){
 setStatus(data.status);

 if(data.status === "accepted"){
  setDriver(data);
 }

}

setLoading(false);

});

return ()=>unsub();

},[bookingId]);

if(loading){
return(
<View style={styles.center}>
<ActivityIndicator size="large" color="#e53935"/>
<Text style={styles.loading}>Looking for nearby ambulances...</Text>
</View>
);
}

return(

<View style={styles.container}>

<Text style={styles.header}>🚑 Ambulance Tracking</Text>

{status === "searching" && (
<View style={styles.card}>
<Text style={styles.waiting}>Searching for nearby ambulances...</Text>
</View>
)}

{status === "accepted" && driver && (

<View style={styles.card}>

<Text style={styles.success}>Ambulance On The Way</Text>

<Text style={styles.label}>Driver</Text>
<Text style={styles.value}>{driver.driverName}</Text>

<Text style={styles.label}>Phone</Text>
<Text style={styles.value}>{driver.driverPhone}</Text>

<TouchableOpacity style={styles.callButton}>
<Text style={styles.callText}>Call Driver</Text>
</TouchableOpacity>

</View>

)}

</View>

);

}

const styles = StyleSheet.create({

container:{
 flex:1,
 backgroundColor:"#f6f8fb",
 padding:20
},

header:{
 fontSize:24,
 fontWeight:"bold",
 marginBottom:20,
 textAlign:"center"
},

center:{
 flex:1,
 justifyContent:"center",
 alignItems:"center"
},

loading:{
 marginTop:10,
 color:"#777"
},

card:{
 backgroundColor:"#fff",
 padding:20,
 borderRadius:14,
 shadowColor:"#000",
 shadowOpacity:0.1,
 shadowOffset:{width:0,height:4},
 shadowRadius:6,
 elevation:4
},

waiting:{
 fontSize:16,
 textAlign:"center",
 color:"#777"
},

success:{
 fontSize:20,
 fontWeight:"bold",
 color:"#2e7d32",
 marginBottom:15
},

label:{
 color:"#999",
 marginTop:8
},

value:{
 fontSize:18,
 fontWeight:"bold"
},

callButton:{
 marginTop:20,
 backgroundColor:"#e53935",
 padding:14,
 borderRadius:10,
 alignItems:"center"
},

callText:{
 color:"#fff",
 fontWeight:"bold"
}

});