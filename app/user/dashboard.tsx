import { View,Text,TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function Dashboard(){

return(

<View style={{flex:1,justifyContent:"center",alignItems:"center"}}>

<Text>User Dashboard</Text>

<TouchableOpacity
onPress={()=>router.push("/user/booking")}
style={{marginTop:20}}
>

<Text>Book Ambulance</Text>

</TouchableOpacity>

</View>

);

}
