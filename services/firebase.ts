import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence } from "firebase/auth";
// getReactNativePersistence is provided by Firebase Authentication's React Native entrypoint
// but this package may not export it directly in this distribution, so we load it dynamically.
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAT9tDlfmdCRb8Eo3LC_5-ej96CdQAdWag",
  projectId: "ambulance-tracking-and-booking",
  storageBucket: "ambulance-tracking-and-booking.firebasestorage.app",
  messagingSenderId: "580969131821",
  appId: "1:580969131821:web:cb632d29d1bfff63b86da4",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistent local storage on React Native.
// Fall back to inMemoryPersistence when RN persistence helper is unavailable.
let persistence = inMemoryPersistence;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { getReactNativePersistence } = require("@firebase/auth/dist/rn");
  if (typeof getReactNativePersistence === "function") {
    persistence = getReactNativePersistence(AsyncStorage);
  }
} catch (error) {
  console.warn("@firebase/auth/dist/rn not available; using inMemoryPersistence instead", error);
}

export const auth = initializeAuth(app, { persistence });

// Initialize Firestore
export const db = getFirestore(app);

export default app;
