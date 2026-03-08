import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { auth } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserRole } from "../services/getUserRole";

export default function Index() {

useEffect(()=>{

const unsub = onAuthStateChanged(auth, async(user)=>{

 if(!user){
  router.replace("/login");
  return;
 }

 try{

 const role = await getUserRole(user.uid);

 if(role==="driver"){
  router.replace("/driver/dashboard");
 }
 else if(role==="user"){
  router.replace("/user/dashboard");
 }
 else{
  router.replace("/login");
 }

 }catch(err){
  router.replace("/login");
 }

});

return unsub;

},[])

return(

<View style={{
 flex:1,
 justifyContent:"center",
 alignItems:"center"
}}>

<ActivityIndicator size="large"/>

</View>

)

}
