// 📁 app/driver/tracklocation.ts
// GPS Tracking Service for Drivers

import * as Location from "expo-location";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { GeoLocation } from "./driverType";

let locationSubscription: Location.LocationSubscription | null = null;

// ==============================
// REQUEST LOCATION PERMISSIONS
// ==============================
export const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    console.log("Location permission denied");
    return false;
  }
  return true;
};

// ==============================
// START DRIVER TRACKING
// ==============================
export const startDriverTracking = async (driverId: string): Promise<void> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    // Start watching position
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Or every 10 meters
      },
      async (location) => {
        const geoLocation: GeoLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
        };

        // Update Firestore with driver location
        await updateDoc(doc(db, "drivers", driverId), {
          location: geoLocation,
          lastLocationUpdate: Date.now(),
        });

        console.log("Driver location updated:", geoLocation);
      }
    );

    console.log("Driver tracking started");
  } catch (error) {
    console.error("Start tracking error:", error);
  }
};

// ==============================
// STOP DRIVER TRACKING
// ==============================
export const stopDriverTracking = (): void => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    console.log("Driver tracking stopped");
  }
};

// ==============================
// GET CURRENT LOCATION (One-time)
// ==============================
export const getCurrentLocation = async (): Promise<GeoLocation | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Get current location error:", error);
    return null;
  }
};

// // <View style={styles.loader}>

// // <ActivityIndicator size="large" color="#e53935"/>

// // <Text style={{marginTop:10}}>
// // Finding ambulance...
// // </Text>

// // </View>

// // );

// // }



// // // ================================
// // // MAIN UI
// // // ================================

// // return(

// // <SafeAreaView style={styles.container}>

// // <MapView
// // style={styles.map}

// // region={{

// // latitude: driverLocation?.latitude || userLocation?.latitude,
// // longitude: driverLocation?.longitude || userLocation?.longitude,
// // latitudeDelta:0.01,
// // longitudeDelta:0.01

// // }}

// // >

// // {/* USER MARKER */}

// // {userLocation && (

// // <Marker
// // coordinate={userLocation}
// // title="Your Location"
// // pinColor="blue"
// // />

// // )}


// // {/* DRIVER MARKER */}

// // {driverLocation && (

// // <Marker
// // coordinate={driverLocation}
// // title="Ambulance"
// // pinColor="red"
// // />

// // )}


// // {/* ROUTE LINE */}

// // {driverLocation && userLocation && (

// // <Polyline
// // coordinates={[driverLocation,userLocation]}
// // strokeWidth={4}
// // strokeColor="red"
// // />

// // )}

// // </MapView>



// // {/* STATUS PANEL */}

// // <View style={styles.infoBox}>

// // <Text style={styles.title}>
// // 🚑 Ambulance Tracking
// // </Text>


// // <Text style={styles.status}>
// // Status: {status}
// // </Text>


// // <Text style={styles.info}>
// // Distance Remaining: {distance.toFixed(2)} km
// // </Text>


// // <Text style={styles.info}>
// // Estimated Arrival: {eta} minutes
// // </Text>

// // </View>

// // </SafeAreaView>

// // );

// // }



// // // ================================
// // // STYLES
// // // ================================

// // const styles = StyleSheet.create({

// // container:{
// // flex:1,
// // backgroundColor:"#fff"
// // },

// // map:{
// // flex:1
// // },

// // infoBox:{
// // position:"absolute",
// // bottom:30,
// // left:20,
// // right:20,
// // backgroundColor:"#fff",
// // padding:20,
// // borderRadius:15,
// // shadowColor:"#000",
// // shadowOpacity:0.2,
// // shadowOffset:{width:0,height:4},
// // shadowRadius:6,
// // elevation:6
// // },

// // title:{
// // fontSize:20,
// // fontWeight:"bold",
// // textAlign:"center",
// // color:"#e53935",
// // marginBottom:10
// // },

// // status:{
// // textAlign:"center",
// // fontSize:16,
// // marginBottom:5
// // },

// // info:{
// // textAlign:"center",
// // fontSize:16,
// // marginTop:4
// // },

// // loader:{
// // flex:1,
// // justifyContent:"center",
// // alignItems:"center"
// // }

// // });
// import {
//     ActivityIndicator,
//     SafeAreaView,
//     StyleSheet,
//     Text,
//     View
// } from "react-native";

// import { useEffect, useRef, useState } from "react";
// import MapView, { Marker, Polyline } from "react-native-maps";

// import { doc, onSnapshot, updateDoc } from "firebase/firestore";
// import { db } from "../../services/firebase";

// import * as Location from 'expo-location';
// import { useLocalSearchParams } from "expo-router";

// type LocationType = {
// latitude: number;
// longitude: number;
// };

// export default function Tracking() {

// const { id } = useLocalSearchParams<{ id: string }>();

// const mapRef = useRef<MapView | null>(null);

// const [driverLocation, setDriverLocation] = useState<LocationType | null>(null);
// const [userLocation, setUserLocation] = useState<LocationType | null>(null);

// const [status, setStatus] = useState<string>("Searching ambulance...");
// const [distance, setDistance] = useState<number>(0);
// const [eta, setEta] = useState<number>(0);
// const [loading, setLoading] = useState<boolean>(true);


// //////////////////////////////////////////////////////
// // DISTANCE CALCULATION (HAVERSINE)
// //////////////////////////////////////////////////////

// const calculateDistance = (
// lat1:number,
// lon1:number,
// lat2:number,
// lon2:number
// )=>{

// const R = 6371;

// const dLat = (lat2-lat1) * Math.PI/180;
// const dLon = (lon2-lon1) * Math.PI/180;

// const a =
// Math.sin(dLat/2) * Math.sin(dLat/2) +
// Math.cos(lat1*Math.PI/180) *
// Math.cos(lat2*Math.PI/180) *
// Math.sin(dLon/2) * Math.sin(dLon/2);

// const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

// return R * c;

// };


// //////////////////////////////////////////////////////
// // REALTIME FIRESTORE LISTENER
// //////////////////////////////////////////////////////

// useEffect(()=>{

// if(!id) return;

// const bookingRef = doc(db,"bookings",String(id));

// const unsubscribe = onSnapshot(bookingRef,(snapshot)=>{

// const data:any = snapshot.data();

// if(!data) return;


// // USER LOCATION
// if(data.latitude && data.longitude){

// const userLoc = {
// latitude:data.latitude,
// longitude:data.longitude
// };

// setUserLocation(userLoc);

// }


// // DRIVER LOCATION
// if(data.driverLocation){

// setDriverLocation({
// latitude:data.driverLocation.latitude,
// longitude:data.driverLocation.longitude
// });

// }


// // STATUS
// if(data.status){
// setStatus(data.status);
// }


// // DISTANCE + ETA
// if(data.driverLocation && data.latitude){

// const dist = calculateDistance(
// data.driverLocation.latitude,
// data.driverLocation.longitude,
// data.latitude,
// data.longitude
// );

// setDistance(dist);

// const avgSpeed = 40;

// const etaMinutes = (dist / avgSpeed) * 60;

// setEta(Math.max(1, Math.round(etaMinutes)));

// }


// // AUTO ZOOM MAP
// if(
// mapRef.current &&
// data.driverLocation &&
// data.latitude
// ){

// mapRef.current.fitToCoordinates(
// [
// {
// latitude:data.latitude,
// longitude:data.longitude
// },
// data.driverLocation
// ],
// {
// edgePadding:{
// top:120,
// right:120,
// bottom:120,
// left:120
// },
// animated:true
// }
// );

// }

// setLoading(false);

// });

// return ()=>unsubscribe();

// },[id]);


// //////////////////////////////////////////////////////
// // LOADING SCREEN
// //////////////////////////////////////////////////////

// if(loading || !userLocation){

// return(

// <View style={styles.loader}>

// <ActivityIndicator size="large" color="#e53935"/>

// <Text style={{marginTop:10}}>
// Finding nearest ambulance...
// </Text>

// </View>

// );

// }


// //////////////////////////////////////////////////////
// // MAIN UI
// //////////////////////////////////////////////////////

// return(

// <SafeAreaView style={styles.container}>

// <MapView
// ref={mapRef}
// style={styles.map}
// initialRegion={{
// latitude:userLocation.latitude,
// longitude:userLocation.longitude,
// latitudeDelta:0.02,
// longitudeDelta:0.02
// }}
// >

// {/* USER MARKER */}

// <Marker
// coordinate={userLocation}
// title="Your Location"
// pinColor="blue"
// />


// {/* DRIVER MARKER */}

// {driverLocation && (

// <Marker
// coordinate={driverLocation}
// title="Ambulance"
// pinColor="red"
// />

// )}


// {/* ROUTE */}

// {driverLocation && (

// <Polyline
// coordinates={[driverLocation,userLocation]}
// strokeWidth={5}
// strokeColor="#e53935"
// />

// )}

// </MapView>


// {/* INFO PANEL */}

// <View style={styles.infoBox}>

// <Text style={styles.title}>
// 🚑 Ambulance On The Way
// </Text>

// <Text style={styles.status}>
// Status: {status}
// </Text>

// <Text style={styles.info}>
// 📏 Distance Remaining: {distance.toFixed(2)} km
// </Text>

// <Text style={styles.info}>
// ⏱ ETA: {eta} minutes
// </Text>

// </View>

// </SafeAreaView>

// );

// }


// //////////////////////////////////////////////////////
// // STYLES
// //////////////////////////////////////////////////////

// const styles = StyleSheet.create({

// container:{
// flex:1,
// backgroundColor:"#fff"
// },

// map:{
// flex:1
// },

// infoBox:{
// position:"absolute",
// bottom:30,
// left:20,
// right:20,
// backgroundColor:"#fff",
// padding:20,
// borderRadius:15,
// shadowColor:"#000",
// shadowOpacity:0.2,
// shadowOffset:{width:0,height:4},
// shadowRadius:6,
// elevation:6
// },

// title:{
// fontSize:20,
// fontWeight:"bold",
// textAlign:"center",
// color:"#e53935",
// marginBottom:10
// },

// status:{
// textAlign:"center",
// fontSize:16,
// marginBottom:6
// },

// info:{
// textAlign:"center",
// fontSize:16,
// marginTop:4
// },

// loader:{
// flex:1,
// justifyContent:"center",
// alignItems:"center"
// }

// });

// // ================================
// // DRIVER TRACKING FUNCTIONS
// // ================================

// let locationSubscription: Location.LocationSubscription | null = null;

// export const startDriverTracking = async (driverId: string) => {
//   try {
//     const { status } = await Location.requestForegroundPermissionsAsync();
//     if (status !== 'granted') {
//       console.log('Location permission denied');
//       return;
//     }

//     locationSubscription = await Location.watchPositionAsync(
//       {
//         accuracy: Location.Accuracy.High,
//         timeInterval: 5000, // Update every 5 seconds
//         distanceInterval: 10, // Update every 10 meters
//       },
//       async (location) => {
//         const { latitude, longitude } = location.coords;
//         await updateDoc(doc(db, 'drivers', driverId), {
//           location: { latitude, longitude },
//           lastLocationUpdate: Date.now(),
//         });
//       }
//     );
//   } catch (error) {
//     console.log('Error starting driver tracking:', error);
//   }
// };

// export const stopDriverTracking = () => {
//   if (locationSubscription) {
//     locationSubscription.remove();
//     locationSubscription = null;
//   }
// };
// 📁 app/driver/Tracking.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

// Conditionally import react-native-maps only on native platforms
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.MapView;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
}

import { useLocalSearchParams } from "expo-router";
import { onSnapshot } from "firebase/firestore";

type LocationType = {
  latitude: number;
  longitude: number;
};

export default function Tracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<any>(null);

  const [driverLocation, setDriverLocation] = useState<LocationType | null>(
    null
  );
  const [userLocation, setUserLocation] = useState<LocationType | null>(null);
  const [status, setStatus] = useState<string>("Searching ambulance...");
  const [distance, setDistance] = useState<number>(0);
  const [eta, setEta] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // ==============================
  // DISTANCE & ETA CALCULATION
  // ==============================
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ==============================
  // FIRESTORE LISTENER
  // ==============================
  useEffect(() => {
    if (!id) return;

    const bookingRef = doc(db, "bookings", String(id));
    const unsubscribe = onSnapshot(bookingRef, (snapshot) => {
      const data: any = snapshot.data();
      if (!data) return;

      // USER LOCATION
      if (data.latitude && data.longitude) {
        setUserLocation({ latitude: data.latitude, longitude: data.longitude });
      }

      // DRIVER LOCATION
      if (data.driverLocation) {
        setDriverLocation({
          latitude: data.driverLocation.latitude,
          longitude: data.driverLocation.longitude,
        });
      }

      // STATUS
      if (data.status) setStatus(data.status);

      // DISTANCE & ETA
      if (data.driverLocation && data.latitude) {
        const dist = calculateDistance(
          data.driverLocation.latitude,
          data.driverLocation.longitude,
          data.latitude,
          data.longitude
        );
        setDistance(dist);
        const avgSpeed = 40; // km/h average
        const etaMinutes = (dist / avgSpeed) * 60;
        setEta(Math.max(1, Math.round(etaMinutes)));
      }

      // AUTO ZOOM
      if (mapRef.current && data.driverLocation && data.latitude) {
        mapRef.current.fitToCoordinates(
          [
            { latitude: data.latitude, longitude: data.longitude },
            data.driverLocation,
          ],
          { edgePadding: { top: 120, right: 120, bottom: 120, left: 120 }, animated: true }
        );
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  // ==============================
  // LOADING SCREEN
  // ==============================
  if (loading || !userLocation) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#e53935" />
        <Text style={{ marginTop: 10 }}>Finding nearest ambulance...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {MapView ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* USER MARKER */}
          <Marker coordinate={userLocation} title="Your Location" pinColor="blue" />

          {/* DRIVER MARKER */}
          {driverLocation && (
            <Marker coordinate={driverLocation} title="Ambulance" pinColor="red" />
          )}

          {/* ROUTE POLYLINE */}
          {driverLocation && <Polyline coordinates={[driverLocation, userLocation]} strokeWidth={5} strokeColor="#e53935" />}
        </MapView>
      ) : (
        <View style={styles.map}>
          <Text>Map not available on web</Text>
        </View>
      )}

      {/* INFO PANEL */}
      <View style={styles.infoBox}>
        <Text style={styles.title}>🚑 Ambulance On The Way</Text>
        <Text style={styles.status}>Status: {status}</Text>
        <Text style={styles.info}>📏 Distance Remaining: {distance.toFixed(2)} km</Text>
        <Text style={styles.info}>⏱ ETA: {eta} minutes</Text>
      </View>
    </SafeAreaView>
  );
}

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  infoBox: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#e53935",
    marginBottom: 10,
  },
  status: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 6,
  },
  info: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});