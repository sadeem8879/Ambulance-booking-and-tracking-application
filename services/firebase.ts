import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
// @ts-ignore - getReactNativePersistence is available in React Native builds, but TypeScript doesn't recognize it
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAT9tDlfmdCRb8Eo3LC_5-ej96CdQAdWag",
  authDomain: "ambulance-tracking-and-booking.firebaseapp.com",
  projectId: "ambulance-tracking-and-booking",
  storageBucket: "ambulance-tracking-and-booking.firebasestorage.app",
  messagingSenderId: "580969131821",
  appId: "1:580969131821:web:cb632d29d1bfff63b86da4",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
export const db = getFirestore(app);

export default app;
