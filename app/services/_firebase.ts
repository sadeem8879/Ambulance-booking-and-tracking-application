import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAT9tDlfmdCRb8Eo3LC_5-ej96CdQAdWag",
  authDomain: "ambulance-tracking-and-booking.firebaseapp.com",
  projectId: "ambulance-tracking-and-booking",
  storageBucket: "ambulance-tracking-and-booking.firebasestorage.app",
  messagingSenderId: "580969131821",
  appId: "1:580969131821:web:cb632d29d1bfff63b86da4",
};
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);