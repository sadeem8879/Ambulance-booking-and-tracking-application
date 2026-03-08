import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import {
  initializeAuth,
  getAuth,
  getReactNativePersistence
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAT9tDlfmdCRb8Eo3LC_5-ej96CdQAdWag",
  authDomain: "ambulance-tracking-and-booking.firebaseapp.com",
  projectId: "ambulance-tracking-and-booking",
  storageBucket: "ambulance-tracking-and-booking.firebasestorage.app",
  messagingSenderId: "580969131821",
  appId: "1:580969131821:web:cb632d29d1bfff63b86da4",
};

/*
Prevent multiple Firebase app initialization (Expo fast refresh fix)
*/
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/*
Auth with AsyncStorage persistence
*/
let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

export { auth };

export const db = getFirestore(app);