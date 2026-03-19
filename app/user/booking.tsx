import { Picker } from '@react-native-picker/picker';
import { router } from "expo-router";
import { addDoc, collection, doc, getDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { GeoLocation } from "../../lib/driverTypes";
import {
    calculateCompleteFare,
    validateFareInput
} from "../../lib/fareCalculationService";
import {
    calculateDistance,
    geocodeAddress,
    getCurrentLocation as getDeviceCurrentLocation,
    getETA
} from "../../lib/locationService";
import { auth, db } from "../../services/firebase";

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
        const location = await geocodeAddress(address);
        if (!location) {
          Alert.alert("Not Found", "Could not find location for the given address.");
          setAddressLoading(false);
          return;
        }
        setPickupLocation(location);
        setMapRegion({
          latitude: location.latitude,
          longitude: location.longitude,
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
  const [destinationLocation, setDestinationLocation] = useState<GeoLocation | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationAddressLoading, setDestinationAddressLoading] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [estimatedFareAmount, setEstimatedFareAmount] = useState<number>(0);
  const [estimatedETA, setEstimatedETA] = useState<number>(0);
  const [fareDetails, setFareDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.7041,
    longitude: 77.1025,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // ==============================
  // AUTO GET CURRENT LOCATION ON MOUNT & UPDATE FARE
  // ==============================
  useEffect(() => {
    getCurrentLocationOnMount();
  }, []);

  // ==============================
  // UPDATE FARE & ETA WHEN LOCATIONS CHANGE
  // ==============================
  useEffect(() => {
    if (pickupLocation && destinationLocation) {
      calculateAndUpdateFare();
    } else {
      setDistanceKm(0);
      setEstimatedFareAmount(0);
      setEstimatedETA(0);
      setFareDetails(null);
    }
  }, [pickupLocation, destinationLocation, emergency]);

  const getCurrentLocationOnMount = async () => {
    setLoading(true);
    try {
      const location = await getDeviceCurrentLocation();
      if (location) {
        setPickupLocation(location);
        setMapRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        Alert.alert("Location Access", "Could not access your location. Please enable location services.");
      }
    } catch (error) {
      console.error("Get location error:", error);
      Alert.alert("Error", "Failed to get location");
    } finally {
      setLoading(false);
    }
  };

  const handlePickupLocationPress = () => {
    getCurrentLocationOnMount();
  };

  const calculateAndUpdateFare = () => {
    if (!pickupLocation || !destinationLocation) return;

    try {
      const distance = calculateDistance(pickupLocation, destinationLocation);

      // Validate distance
      const validation = validateFareInput(distance, emergency);
      if (!validation.valid) {
        console.warn("Distance validation:", validation.error);
        return;
      }

      // Calculate fare with full breakdown
      const fareComponents = calculateCompleteFare(distance, emergency, 0);

      // Calculate ETA
      const eta = getETA(distance);

      setDistanceKm(distance);
      setEstimatedFareAmount(fareComponents.totalFare);
      setEstimatedETA(eta);
      setFareDetails(fareComponents);
    } catch (error) {
      console.error("Fare calculation error:", error);
      // Set default fare if calculation fails
      setEstimatedFareAmount(50); // Base fare
    }
  };

  // ==============================
  // GEOCODE DESTINATION ADDRESS
  // ==============================
  const handleDestinationAddressToLocation = async () => {
    if (!destinationAddress.trim()) {
      Alert.alert("Enter Address", "Please enter destination address/hospital name.");
      return;
    }
    setDestinationAddressLoading(true);
    try {
      const location = await geocodeAddress(destinationAddress);
      if (!location) {
        Alert.alert("Not Found", "Could not find location for the given address.");
        setDestinationAddressLoading(false);
        return;
      }
      setDestinationLocation(location);
    } catch (err) {
      console.error("Geocode error:", err);
      Alert.alert("Error", "Failed to find location for address");
    } finally {
      setDestinationAddressLoading(false);
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
    if (!patientName || !emergency || !phoneNumber || !pickupLocation || !destinationLocation) {
      Alert.alert("Missing Info", "Please fill all required fields and set both pickup and destination locations");
      return;
    }

    if (!auth.currentUser) {
      Alert.alert("Not Logged In", "Please login first");
      return;
    }

    if (estimatedFareAmount <= 0) {
      Alert.alert("Invalid Fare", "Please ensure distance is calculated correctly");
      return;
    }

    try {
      // Get user profile for contact info
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const userPhone = userData?.phone || phoneNumber;

      const generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();

      const bookingRef = await addDoc(collection(db, "bookings"), {
        userId: auth.currentUser.uid,
        userPhone: userPhone,
        patientName: patientName,
        emergency: emergency,
        phoneNumber: phoneNumber,
        additionalNotes: additionalNotes,
        pickupLocation: pickupLocation,
        destinationLocation: destinationLocation,
        destinationAddress: destinationAddress,
        distanceKm: distanceKm,
        estimatedFare: estimatedFareAmount,
        fareBreakdown: fareDetails, // Store complete fare breakdown
        eta: estimatedETA,
        status: "searching",
        otp: generatedOTP,
        requestedAt: Timestamp.now(),
      });

      Alert.alert(
        "Success",
        `🚑 Ambulance request sent!\n\n📍 Distance: ${distanceKm.toFixed(2)} km\n⏱️ ETA: ~${estimatedETA} min\n💵 Est Fare: ₹${estimatedFareAmount.toFixed(2)}`
      );

      // Redirect to tracking screen
      router.push(`/user/tracking?bookingId=${bookingRef.id}`);

      // Reset form
      setPatientName("");
      setEmergency("");
      setPhoneNumber("");
      setAdditionalNotes("");
      setPickupLocation(null);
      setDestinationLocation(null);
      setDestinationAddress("");
      setDistanceKm(0);
      setEstimatedFareAmount(0);
      setEstimatedETA(0);
      setFareDetails(null);
    } catch (error) {
      console.error("Booking error:", error);
      Alert.alert("Error", "Failed to create booking. Please try again.");
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
            onPress={handlePickupLocationPress}
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

          {/* DESTINATION LOCATION SECTION */}
          <Text style={styles.label}>🏥 Destination / Hospital Address *</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <TextInput
              placeholder="Enter hospital or destination address"
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={destinationAddress}
              onChangeText={setDestinationAddress}
              editable={!destinationAddressLoading}
            />
            <TouchableOpacity
              style={[styles.locationBtn, { marginLeft: 8, paddingHorizontal: 12, paddingVertical: 12 }]}
              onPress={handleDestinationAddressToLocation}
              disabled={destinationAddressLoading}
            >
              <Text style={styles.locationBtnText}>{destinationAddressLoading ? "..." : "Set"}</Text>
            </TouchableOpacity>
          </View>
          {destinationLocation && (
            <Text style={styles.locationText}>
              Lat: {destinationLocation.latitude.toFixed(4)}, Lon: {destinationLocation.longitude.toFixed(4)}
            </Text>
          )}

          {/* FARE SUMMARY - DETAILED BREAKDOWN */}
          {pickupLocation && destinationLocation && (
            <View style={styles.fareSummary}>
              <Text style={styles.fareSummaryTitle}>💵 Fare Breakdown</Text>
              
              {/* Distance & ETA */}
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>📍 Distance:</Text>
                <Text style={styles.fareValue}>{distanceKm.toFixed(2)} km</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>⏱️ Est. Time:</Text>
                <Text style={styles.fareValue}>~{estimatedETA} min</Text>
              </View>

              {/* Fare Components */}
              <View style={styles.breakdownDivider} />
              
              {fareDetails && (
                <>
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Base Fare:</Text>
                    <Text style={styles.fareValue}>₹{fareDetails.baseFare.toFixed(2)}</Text>
                  </View>

                  {fareDetails.distanceCharge > 0 && (
                    <View style={styles.fareRow}>
                      <Text style={styles.fareLabel}>Distance Charge:</Text>
                      <Text style={styles.fareValue}>₹{fareDetails.distanceCharge.toFixed(2)}</Text>
                    </View>
                  )}

                  {fareDetails.emergencySurcharge > 0 && (
                    <View style={styles.fareRow}>
                      <Text style={styles.fareLabel}>Emergency Surcharge:</Text>
                      <Text style={[styles.fareValue, styles.surgchargeText]}>₹{fareDetails.emergencySurcharge.toFixed(2)}</Text>
                    </View>
                  )}

                  <View style={[styles.fareRow, styles.fareTotal]}>
                    <Text style={styles.fareTotalLabel}>Total Fare:</Text>
                    <Text style={styles.fareTotalValue}>₹{fareDetails.totalFare.toFixed(2)}</Text>
                  </View>
                </>
              )}

              <Text style={styles.fareNote}>*Final amount based on actual distance traveled</Text>
            </View>
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
  },
  fareSummary:{
    backgroundColor:"#FFF9C4",
    borderRadius:12,
    padding:16,
    marginBottom:20,
    borderLeftWidth:4,
    borderLeftColor:"#FBC02D",
    shadowColor:"#000",
    shadowOpacity:0.1,
    shadowOffset:{width:0,height:2},
    shadowRadius:3,
    elevation:3
  },
  fareSummaryTitle:{
    fontSize:16,
    fontWeight:"bold",
    color:"#F57F17",
    marginBottom:12
  },
  fareRow:{
    flexDirection:"row",
    justifyContent:"space-between",
    paddingVertical:8,
    borderBottomWidth:1,
    borderBottomColor:"#FFE082"
  },
  fareTotal:{
    borderBottomWidth:2,
    borderBottomColor:"#F57F17",
    paddingVertical:12,
    marginTop:4
  },
  fareLabel:{
    fontSize:14,
    color:"#666",
    fontWeight:"600"
  },
  fareTotalLabel:{
    fontSize:15,
    color:"#F57F17",
    fontWeight:"700"
  },
  fareValue:{
    fontSize:14,
    color:"#333",
    fontWeight:"600"
  },
  fareTotalValue:{
    fontSize:16,
    color:"#F57F17",
    fontWeight:"bold"
  },
  fareNote:{
    fontSize:12,
    color:"#E65100",
    fontStyle:"italic",
    marginTop:10,
    textAlign:"center"
  },
  breakdownDivider:{
    height:1,
    backgroundColor:"#FFE082",
    marginVertical:10
  },
  surgchargeText:{
    color:"#E53935",
    fontWeight:"bold"
  }
});