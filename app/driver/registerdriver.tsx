import React,{ useState } from "react";
import {
 View,
 Text,
 TextInput,
 StyleSheet,
 TouchableOpacity,
 Alert
} from "react-native";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth,db } from "../../services/firebase";
import { doc,setDoc } from "firebase/firestore";
import { router } from "expo-router";

export default function RegisterDriver(){

const [name,setName] = useState("");
const [email,setEmail] = useState("");
const [phone,setPhone] = useState("");
const [ambulance,setAmbulance] = useState("");
const [license,setLicense] = useState("");
const [password,setPassword] = useState("");

const register = async()=>{

try{

const res = await createUserWithEmailAndPassword(auth,email,password);

await setDoc(doc(db,"drivers",res.user.uid),{

name,
email,
phone,
ambulanceNumber:ambulance,
licenseNumber:license,

approved:false,
active:false,

lat:0,
lng:0,

role:"driver",
createdAt:Date.now()

});

Alert.alert("Registration submitted","Wait for admin approval");

router.replace("/login");

}catch(e:any){
Alert.alert(e.message)
}

};

return(

<View style={styles.container}>

<Text style={styles.title}>🚑 Driver Registration</Text>

<TextInput
placeholder="Full Name"
style={styles.input}
onChangeText={setName}
/>

<TextInput
placeholder="Email"
style={styles.input}
onChangeText={setEmail}
/>

<TextInput
placeholder="Phone"
style={styles.input}
keyboardType="phone-pad"
onChangeText={setPhone}
/>

<TextInput
placeholder="Ambulance Number"
style={styles.input}
onChangeText={setAmbulance}
/>

<TextInput
placeholder="License Number"
style={styles.input}
onChangeText={setLicense}
/>

<TextInput
placeholder="Password"
style={styles.input}
secureTextEntry
onChangeText={setPassword}
/>

<TouchableOpacity style={styles.button} onPress={register}>
<Text style={styles.buttonText}>Register</Text>
</TouchableOpacity>

</View>

);

}

const styles = StyleSheet.create({

container:{
 flex:1,
 backgroundColor:"#f6f8fb",
 justifyContent:"center",
 padding:25
},

title:{
 fontSize:28,
 fontWeight:"bold",
 textAlign:"center",
 marginBottom:30
},

input:{
 backgroundColor:"#fff",
 padding:14,
 borderRadius:10,
 marginBottom:12,
 borderWidth:1,
 borderColor:"#eee"
},

button:{
 backgroundColor:"#e53935",
 padding:16,
 borderRadius:10,
 alignItems:"center",
 marginTop:10
},

buttonText:{
 color:"#fff",
 fontWeight:"bold",
 fontSize:16
}

});