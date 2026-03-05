import { doc, getDoc } from "firebase/firestore";
import { db } from "./_firebase";

export const getUserRole = async (uid: string) => {

  try {

    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return snap.data().role;
    }

    return "user";

  } catch (error) {
    console.log("Role fetch error", error);
    return "user";
  }

};
