
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { auth } from "../../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserRole } from "../../services/getUserRole";

export default function Index() {

  useEffect(()=>{

    const unsub = onAuthStateChanged(auth, async(user)=>{

      if(!user){
        router.replace("/login");
        return;
      }

      const role = await getUserRole(user.uid);

      if(role==="driver"){
        router.replace("/driver/dashboard");
      }
      else{
        router.replace("/user/dashboard");
      }

    });

    return unsub;

  },[])

  return(
    <View style={{flex:1,justifyContent:"center"}}>
      <ActivityIndicator size="large"/>
    </View>
  )

}
