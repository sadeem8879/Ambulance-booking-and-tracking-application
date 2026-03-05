import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { useState } from "react";

export default function HomeScreen() {

  const router = useRouter();

  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = async () => {

    try {

      setLoading(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Location permission denied");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(loc.coords);

    } catch (error) {
      console.log(error);
      alert("Failed to get location");
    } finally {
      setLoading(false);
    }

  };

  const handleBook = () => {

    if (!location) {
      alert("Please detect location first");
      return;
    }

    router.push({
      pathname: "/booking",
      params: {
        lat: location.latitude,
        lng: location.longitude,
      },
    });

  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        🚑 Ambulance Service
      </Text>

      {/* Map */}

      {location ? (

        <MapView
          style={styles.map}
          region={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >

          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Your Location"
            description="Patient Location"
          />

        </MapView>

      ) : (

        <View style={styles.mapPlaceholder}>
          <Text>Location not detected</Text>
        </View>

      )}

      {loading && (
        <ActivityIndicator
          size="large"
          color="red"
          style={{ marginTop: 10 }}
        />
      )}

      {/* Detect Location */}

      <TouchableOpacity
        style={styles.locationBtn}
        onPress={getLocation}
      >
        <Text style={styles.btnText}>
          Detect My Location
        </Text>
      </TouchableOpacity>

      {/* Book Ambulance */}

      <TouchableOpacity
        style={[
          styles.bookBtn,
          !location && { backgroundColor: "#aaa" },
        ]}
        onPress={handleBook}
        disabled={!location}
      >
        <Text style={styles.btnText}>
          Book Ambulance
        </Text>
      </TouchableOpacity>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },

  map: {
    height: 320,
    borderRadius: 10,
  },

  mapPlaceholder: {
    height: 320,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 10,
  },

  locationBtn: {
    backgroundColor: "#1976D2",
    padding: 15,
    marginTop: 20,
    borderRadius: 10,
    alignItems: "center",
  },

  bookBtn: {
    backgroundColor: "#e53935",
    padding: 15,
    marginTop: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

});
