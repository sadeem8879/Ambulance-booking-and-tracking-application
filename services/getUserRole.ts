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

export const getUserRole = async (uid: string) => {
  // Drivers are stored in their own collection
  const driverDoc = await getDoc(doc(db, "drivers", uid));
  if (driverDoc.exists()) {
    return "driver";
  }

  // Users (including admins) are stored in the users collection
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data && data.role === "admin") return "admin";
    return "user";
  }

  return null;
};
