import { Picker } from '@react-native-picker/picker';
import * as Location from "expo-location";
import { router } from "expo-router";
import { addDoc, collection, doc, getDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { auth, db } from "../../services/firebase";
import { GeoLocation } from "../driver/_driverType";

const emergencyTypes = [
  { label: 'Select Emergency Type', value: '' },
  { label: 'Heart Attack', value: 'Heart Attack' },
  { label: 'Accident', value: 'Accident' },
  { label: 'Stroke', value: 'Stroke' },
  { label: 'Breathing Difficulty', value: 'Breathing Difficulty' },
  { label: 'Severe Pain', value: 'Severe Pain' },
  { label: 'Other', value: 'Other' },
];

export default function Booking() {
    const [address, setAddress] = useState("");
    const [addressLoading, setAddressLoading] = useState(false);

    // Geocode address to coordinates and update pickup location
    const handleAddressToLocation = async () => {
      if (!address.trim()) {
        Alert.alert("Enter Address", "Please enter an address to search.");
        return;
      }
      setAddressLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location permission is required to use address search");
          setAddressLoading(false);
          return;
        }
        const results = await Location.geocodeAsync(address);
        if (results.length === 0) {
          Alert.alert("Not Found", "Could not find location for the given address.");
          setAddressLoading(false);
          return;
        }
        const loc = results[0];
        const newLocation = {
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: Date.now(),
        };
        setPickupLocation(newLocation);
        setMapRegion({
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (err) {
        console.error("Geocode error:", err);
        Alert.alert("Error", "Failed to find location for address");
      } finally {
        setAddressLoading(false);
      }
    };
  const [patientName, setPatientName] = useState("");
  const [emergency, setEmergency] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [pickupLocation, setPickupLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // ==============================
  // AUTO GET CURRENT LOCATION ON MOUNT
  // ==============================
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to book ambulance");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
      };

      setPickupLocation(newLocation);
      setMapRegion({
        ...newLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error("Get location error:", error);
      Alert.alert("Error", "Failed to get location");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // HANDLE MAP PRESS TO SET LOCATION
  // ==============================
  const onMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    const newLocation = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      timestamp: Date.now(),
    };
    setPickupLocation(newLocation);
  };

  // ==============================
  // REQUEST AMBULANCE
  // ==============================
  const requestAmbulance = async () => {
    if (!patientName || !emergency || !phoneNumber || !pickupLocation) {
      Alert.alert("Missing Info", "Please fill all required fields and set location");
      return;
    }

    if (!auth.currentUser) {
      Alert.alert("Not Logged In", "Please login first");
      return;
    }

    try {
      // Get user profile for contact info
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const userPhone = userData?.phone || phoneNumber; // fallback to entered phone

      const bookingRef = await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser.uid,
        userPhone: userPhone,
        patientName: patientName,
        emergency: emergency,
        phoneNumber: phoneNumber, // patient's phone
        additionalNotes: additionalNotes,
        pickupLocation: pickupLocation,
        status: "searching",
        requestedAt: Timestamp.now(),
      });

      Alert.alert("Success", "🚑 Ambulance request sent! Driver will be assigned soon.");

      // Redirect to tracking screen
      router.push(`/user/tracking?bookingId=${bookingRef.id}`);

      // Reset form
      setPatientName("");
      setEmergency("");
      setPhoneNumber("");
      setAdditionalNotes("");
      setPickupLocation(null);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🚑 Book Ambulance</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Pickup Address (optional)</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <TextInput
              placeholder="Enter address or landmark"
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={address}
              onChangeText={setAddress}
              editable={!addressLoading}
            />
            <TouchableOpacity
              style={[styles.locationBtn, { marginLeft: 8, paddingHorizontal: 12, paddingVertical: 12 }]}
              onPress={handleAddressToLocation}
              disabled={addressLoading}
            >
              <Text style={styles.locationBtnText}>{addressLoading ? "..." : "Set"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Patient Name *</Text>
          <TextInput
            placeholder="Enter patient name"
            style={styles.input}
            value={patientName}
            onChangeText={setPatientName}
          />
          <Text style={styles.label}>Emergency Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={emergency}
              onValueChange={(itemValue) => setEmergency(itemValue)}
              style={styles.picker}
            >
              {emergencyTypes.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            placeholder="Enter phone number (e.g., +1234567890)"
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Additional Notes</Text>
          <TextInput
            placeholder="Any additional information (optional)"
            style={[styles.input, styles.textArea]}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.label}>Pickup Location *</Text>
          <TouchableOpacity
            style={[styles.locationBtn, pickupLocation && styles.locationSet]}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            <Text style={styles.locationBtnText}>
              {loading ? "Getting Location..." : pickupLocation ? "Location Set ✓" : "Set Current Location"}
            </Text>
          </TouchableOpacity>
          {pickupLocation && (
            <Text style={styles.locationText}>
              Lat: {pickupLocation.latitude.toFixed(4)}, Lon: {pickupLocation.longitude.toFixed(4)}
            </Text>
          )}
          {/* Map for Location Selection */}
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={mapRegion}
              onPress={onMapPress}
              showsUserLocation={true}
              followsUserLocation={true}
            >
              {pickupLocation && (
                <Marker
                  coordinate={pickupLocation}
                  title="Pickup Location"
                  description="Tap to change location"
                  draggable
                  onDragEnd={(e) => {
                    const { coordinate } = e.nativeEvent;
                    setPickupLocation({
                      latitude: coordinate.latitude,
                      longitude: coordinate.longitude,
                      timestamp: Date.now(),
                    });
                  }}
                />
              )}
            </MapView>
          </View>
          <TouchableOpacity style={styles.button} onPress={requestAmbulance}>
            <Text style={styles.buttonText}>Request Ambulance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:"#f8f9fa",
    padding:20
  },
  header:{
    fontSize:28,
    fontWeight:"bold",
    textAlign:"center",
    marginBottom:30,
    color:"#e53935"
  },
  card:{
    backgroundColor:"#fff",
    padding:25,
    borderRadius:15,
    shadowColor:"#000",
    shadowOpacity:0.1,
    shadowOffset:{width:0,height:4},
    shadowRadius:5,
    elevation:5
  },
  label:{
    fontSize:16,
    color:"#333",
    marginBottom:8,
    fontWeight:"600"
  },
  input:{
    borderWidth:1,
    borderColor:"#ddd",
    borderRadius:12,
    padding:15,
    marginBottom:20,
    backgroundColor:"#fafafa",
    fontSize:16,
    shadowColor:"#000",
    shadowOffset:{width:0,height:1},
    shadowOpacity:0.05,
    shadowRadius:2,
    elevation:2
  },
  pickerContainer:{
    borderWidth:1,
    borderColor:"#ddd",
    borderRadius:12,
    marginBottom:20,
    backgroundColor:"#fff",
    shadowColor:"#000",
    shadowOffset:{width:0,height:1},
    shadowOpacity:0.05,
    shadowRadius:2,
    elevation:2
  },
  picker:{
    height:50,
    width: '100%'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationBtn:{
    backgroundColor:"#2196F3",
    padding:15,
    borderRadius:12,
    alignItems:"center",
    marginBottom:15,
    shadowColor:"#000",
    shadowOffset:{width:0,height:2},
    shadowOpacity:0.1,
    shadowRadius:3,
    elevation:3
  },
  locationSet:{
    backgroundColor:"#4CAF50"
  },
  locationBtnText:{
    color:"#fff",
    fontWeight:"bold",
    fontSize:16
  },
  locationText:{
    fontSize:14,
    color:"#666",
    textAlign:"center",
    marginBottom:20,
    fontStyle:"italic"
  },
  mapContainer:{
    height:250,
    borderRadius:12,
    overflow:"hidden",
    marginBottom:25,
    shadowColor:"#000",
    shadowOffset:{width:0,height:2},
    shadowOpacity:0.1,
    shadowRadius:4,
    elevation:4
  },
  map:{
    flex:1
  },
  button:{
    backgroundColor:"#e53935",
    padding:18,
    borderRadius:12,
    alignItems:"center",
    marginTop:10,
    shadowColor:"#000",
    shadowOffset:{width:0,height:2},
    shadowOpacity:0.2,
    shadowRadius:4,
    elevation:5
  },
  buttonText:{
    color:"#fff",
    fontSize:18,
    fontWeight:"bold"
  }
});