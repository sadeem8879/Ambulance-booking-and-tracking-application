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
import { ADMIN_EMAIL } from "../constants/env";
import { auth, db } from "./firebase";

export const getUserRole = async (uid: string) => {
  try {
    // Try driver document first (drivers can only read their own driver doc).
    try {
      const driverDoc = await getDoc(doc(db, "drivers", uid));
      if (driverDoc.exists()) {
        const role = driverDoc.data()?.role as string | undefined;
        if (role === "admin" || role === "driver" || role === "user") {
          return role;
        }
        return "driver";
      }
    } catch (error) {
      const err = error as any;
      if (err.code !== "permission-denied" && !err.message?.includes("Missing or insufficient permissions")) {
        throw err;
      }
      // continue to next lookup
    }

    // Then try user document (users can only read their own user doc).
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const role = userDoc.data()?.role as string | undefined;
        if (role === "admin" || role === "driver" || role === "user") {
          return role;
        }
        return "user";
      }
    } catch (error) {
      const err = error as any;
      if (err.code !== "permission-denied" && !err.message?.includes("Missing or insufficient permissions")) {
        throw err;
      }
      // continue to fallback
    }

    // Fallback: if no user/driver document is found, check custom claims and admin email.
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      const signedInEmail = currentUser.email?.toLowerCase();
      if (signedInEmail && signedInEmail === ADMIN_EMAIL.toLowerCase()) {
        return "admin";
      }

      const idToken = await currentUser.getIdTokenResult();
      const claimRole = idToken.claims.role as string | undefined;
      if (claimRole === "admin" || claimRole === "driver" || claimRole === "user") {
        return claimRole;
      }
      // No explicit role data; treat as standard user account.
      return "user";
    }

    // If we cannot reach auth for some reason, still fallback to user to avoid lockout.
    return "user";
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};
