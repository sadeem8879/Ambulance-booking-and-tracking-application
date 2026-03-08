import { View,Text,TextInput,TouchableOpacity,StyleSheet,Alert } from "react-native";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { router } from "expo-router";
import { auth } from "../services/firebase";
import { getUserRole } from "../services/getUserRole";

export default function Login(){

const [email,setEmail]=useState("");
const [password,setPassword]=useState("");
const [loading,setLoading]=useState(false);

const handleLogin = async ()=>{

 try{

 setLoading(true);

 const result = await signInWithEmailAndPassword(auth,email,password);

 const role = await getUserRole(result.user.uid);

 if(role==="driver"){
  router.replace("/driver/dashboard");
 }
 else if(role==="user"){
  router.replace("/user/dashboard");
 }
 else{
  router.replace("/");
 }

 }catch(err:any){

 Alert.alert("Login Failed",err.message);

 }

 setLoading(false);

};

return(

<View style={styles.container}>

<Text style={styles.title}>🚑 Ambulance App</Text>

<TextInput
 placeholder="Email"
 style={styles.input}
 onChangeText={setEmail}
/>

<TextInput
 placeholder="Password"
 style={styles.input}
 secureTextEntry
 onChangeText={setPassword}
/>

<TouchableOpacity
 style={styles.button}
 onPress={handleLogin}
 disabled={loading}
>
<Text style={styles.btnText}>
{loading ? "Logging in..." : "Login"}
</Text>
</TouchableOpacity>

<TouchableOpacity onPress={()=>router.push("/registeruser")}>
<Text style={styles.link}>Create User Account</Text>
</TouchableOpacity>

<TouchableOpacity onPress={()=>router.push("/driver/registerdriver")}>
<Text style={styles.link}>Register Ambulance Provider</Text>
</TouchableOpacity>

</View>

)

}

const styles = StyleSheet.create({

container:{
 flex:1,
 justifyContent:"center",
 alignItems:"center",
 backgroundColor:"#f5f5f5"
},

title:{
 fontSize:30,
 fontWeight:"bold",
 marginBottom:30
},

input:{
 width:"85%",
 borderWidth:1,
 borderColor:"#ccc",
 padding:12,
 marginBottom:15,
 borderRadius:10,
 backgroundColor:"#fff"
},

button:{
 backgroundColor:"#e53935",
 padding:14,
 borderRadius:10,
 width:"85%",
 alignItems:"center",
 marginBottom:15
},

btnText:{
 color:"#fff",
 fontSize:16,
 fontWeight:"bold"
},

link:{
 marginTop:8,
 color:"#1565c0"
}

});
