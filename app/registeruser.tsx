import { useState } from "react";
import { View,TextInput,TouchableOpacity,Text,Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc,setDoc } from "firebase/firestore";
import { auth,db } from "../services/firebase";
import { router } from "expo-router";

export default function RegisterUser(){

const[name,setName]=useState("");
const[email,setEmail]=useState("");
const[phone,setPhone]=useState("");
const[password,setPassword]=useState("");

const register=async()=>{

try{

const res=await createUserWithEmailAndPassword(auth,email,password);

await setDoc(doc(db,"users",res.user.uid),{

name,
email,
phone,
role:"user",
createdAt:Date.now()

});

Alert.alert("User Registered");

router.replace("/login");

}catch(e:any){
Alert.alert(e.message)
}

};

return(

<View style={{padding:20}}>

<TextInput placeholder="Name" onChangeText={setName}/>
<TextInput placeholder="Email" onChangeText={setEmail}/>
<TextInput placeholder="Phone" onChangeText={setPhone}/>
<TextInput placeholder="Password" secureTextEntry onChangeText={setPassword}/>

<TouchableOpacity onPress={register}>
<Text>Register User</Text>
</TouchableOpacity>

</View>

);

}
