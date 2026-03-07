import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import {
  initializeAuth,
  getReactNativePersistence,
  Auth
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

const app = initializeApp(firebaseConfig);

export const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage as any),
});

export const db = getFirestore(app);
