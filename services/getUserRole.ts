// // import { doc, getDoc } from "firebase/firestore";
// // import { db } from "./firebase";

// // export const getUserRole = async (uid:string) => {

// //  const userDoc = await getDoc(doc(db,"users",uid));

// //  if(userDoc.exists()){
// //    return userDoc.data().role;
// //  }

// //  const driverDoc = await getDoc(doc(db,"drivers",uid));

// //  if(driverDoc.exists()){
// //    return "driver";
// //  }

// //  return "user";
// // };
// import { doc, getDoc } from "firebase/firestore";
// import { db } from "./firebase";

// export const getUserRole = async (uid:string) => {

//   const driverDoc = await getDoc(doc(db,"drivers",uid));

//   if(driverDoc.exists()){
//     return "driver";
//   }

//   const userDoc = await getDoc(doc(db,"users",uid));

//   if(userDoc.exists()){
//     return "user";
//   }

//   return null;
// };
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry logic to handle timing issues with Firestore
const getUserRoleWithRetry = async (uid: string, retries = 3): Promise<string | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check drivers collection
      const driverDoc = await getDoc(doc(db, "drivers", uid));
      if (driverDoc.exists()) {
        console.log(`✅ Driver found on attempt ${attempt}`);
        return "driver";
      }

      // Check users collection
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data && data.role === "admin") {
          console.log(`✅ Admin found on attempt ${attempt}`);
          return "admin";
        }
        console.log(`✅ User found on attempt ${attempt}`);
        return "user";
      }

      // If this is not the last attempt, wait and retry (with exponential backoff)
      if (attempt < retries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 3000); // Max 3 seconds
        console.log(`⏳ User role not found on attempt ${attempt}. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
      }
    } catch (error) {
      console.error(`❌ Error checking user role on attempt ${attempt}:`, error);
      if (attempt < retries) {
        const waitTime = 1000 * Math.pow(2, attempt - 1);
        await delay(waitTime);
      }
    }
  }

  console.log(`❌ User role not found after ${retries} attempts for UID: ${uid}`);
  return null;
};

export const getUserRole = async (uid: string) => {
  return getUserRoleWithRetry(uid, 3);
};
