// // import { View,Text,Switch } from "react-native";
// // import { useState } from "react";
// // import { auth,db } from "../../services/firebase";
// // import { doc,updateDoc } from "firebase/firestore";

// // export default function Dashboard(){

// // const [online,setOnline]=useState(false);

// // const toggleOnline=async(value:boolean)=>{

// // setOnline(value);

// // await updateDoc(doc(db,"drivers",auth.currentUser?.uid),{
// //  isOnline:value
// // });

// // };

// // return(

// // <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>

// // <Text style={{fontSize:24}}>Driver Dashboard</Text>

// // <Text>Go Online</Text>

// // <Switch value={online} onValueChange={toggleOnline}/>

// // </View>

// // )

// // }
// import { View,Text } from "react-native";

// export default function DriverDashboard(){

// return(

// <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>

// <Text style={{fontSize:22}}>
// Driver Dashboard
// </Text>

// <Text>
// You will receive ambulance requests here
// </Text>

// </View>

// )

// }
import { useEffect,useState } from "react";
import { View,Text,FlatList,TouchableOpacity } from "react-native";
import { collection,query,where,onSnapshot,doc,updateDoc } from "firebase/firestore";
import { db,auth } from "../../services/firebase";

export default function DriverDashboard(){

const[bookings,setBookings]=useState<any[]>([]);

useEffect(()=>{

const q=query(
collection(db,"bookings"),
where("status","==","searching")
);

const unsub=onSnapshot(q,(snap)=>{

setBookings(snap.docs.map(doc=>({
id:doc.id,
...doc.data()
})));

});

return()=>unsub();

},[]);


const acceptBooking=async(item:any)=>{

await updateDoc(doc(db,"bookings",item.id),{

status:"accepted",
driverId:auth.currentUser?.uid,
driverName:"Driver",
driverPhone:"9876543210"

});

};

return(

<View style={{flex:1,padding:20}}>

<FlatList
data={bookings}
keyExtractor={(item)=>item.id}

renderItem={({item})=>(

<View style={{marginBottom:20}}>

<Text>Patient: {item.patientName}</Text>
<Text>Emergency: {item.emergency}</Text>

<TouchableOpacity onPress={()=>acceptBooking(item)}>
<Text>Accept Request</Text>
</TouchableOpacity>

</View>

)}

/>

</View>

);

}
