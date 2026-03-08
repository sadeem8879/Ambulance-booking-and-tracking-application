import { View,Text,TouchableOpacity } from "react-native";
import { addDoc,collection } from "firebase/firestore";
import { db,auth } from "../../services/firebase";

export default function Booking(){

const createBooking = async()=>{

await addDoc(collection(db,"bookings"),{

patientName:"Test Patient",
age:"20",
phone:"9999999999",

ambulanceType:"Basic",
emergency:"Accident",

patients:"1",
notes:"",

userLat:18.97,
userLng:72.82,

userId:auth.currentUser?.uid,

createdAt:Date.now(),

status:"searching",

driverId:"",
driverName:"",
driverPhone:"",
driverLat:0,
driverLng:0

});

alert("Ambulance Requested");

};

return(

<View style={{flex:1,justifyContent:"center",alignItems:"center"}}>

<Text>Book Ambulance</Text>

<TouchableOpacity
style={{marginTop:20}}
onPress={createBooking}
>

<Text>Request Ambulance</Text>

</TouchableOpacity>

</View>

);

}
