// 📁 app/services/notifications.ts
// Notification Service for Drivers

import { addDoc, collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { DriverNotification } from "./driverTypes";

// ==============================
// SUBSCRIBE TO DRIVER NOTIFICATIONS
// ==============================
export const subscribeToNotifications = (
  driverId: string,
  callback: (notifications: DriverNotification[]) => void
) => {
  const q = query(
    collection(db, "driverNotifications"),
    where("driverId", "==", driverId)
  );

  const unsubscribe = onSnapshot(q, (snap) => {
    const notifications: DriverNotification[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DriverNotification[];

    callback(notifications);
  });

  return unsubscribe;
};

// ==============================
// MARK NOTIFICATION AS READ
// ==============================
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, "driverNotifications", notificationId), {
      read: true,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
  }
};

// ==============================
// SEND PUSH NOTIFICATION (Placeholder - requires FCM setup)
// ==============================
export const sendPushNotification = async (
  driverId: string,
  title: string,
  body: string
) => {
  // In a real app, you'd use Firebase Cloud Messaging
  // For now, just create an in-app notification
  try {
    await addDoc(collection(db, "driverNotifications"), {
      driverId,
      title,
      message: body,
      type: "admin-message",
      read: false,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error("Send notification error:", error);
  }
};