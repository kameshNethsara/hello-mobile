import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const loging = async (email: string, password: string) => {
    // console.log(email, password);
    return await signInWithEmailAndPassword(auth, email, password);
};

//this is not used beacuse we are using firestore to create user doc adding all user info
// const registerUser = async (name: string, email: string, password: string) => {
//     console.log(name, email, password);

//     const userCred = await createUserWithEmailAndPassword(auth, email, password)
//     await updateProfile(userCred.user, {
//         displayName: name,
//         photoURL: ""
//     })
    
//     //role
//     //firestore(db)
//     setDoc(doc(db, "users", userCred.user.uid), {
//         name: name,
//         role: "user",
//         email: email,
//         createAt: new Date()
//     })
//     return userCred.user
// };

const registerUser = async (
  name: string,
  email: string,
  password: string
) => {
  // Create auth user
  const userCred = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  // Update auth profile
  await updateProfile(userCred.user, {
    displayName: name,
  });

  // CREATE FIRESTORE USER DOC (IMPORTANT)
  await setDoc(doc(db, "users", userCred.user.uid), {
    userId: userCred.user.uid,
    username: name.toLowerCase().replace(/\s+/g, ""),
    fullname: name,
    email: email,
    bio: "",
    image: "",
    followers: 0,
    following: 0,
    posts: 0,
    createdAt: Timestamp.now(),
  });

  return userCred.user;
};

const logout = async () => {
    // console.log("logout")
    await auth.signOut()
    AsyncStorage.clear()
    // AsyncStorage.setItem("key", {});
    // AsyncStorage.getItem("key");

    return
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email); // pass auth
    return { success: true };
  } catch (error: any) {
    console.error("Password reset error:", error);
    let message = "Failed to send reset email";
    if (error.code === "auth/user-not-found") {
      message = "No user found with this email";
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address";
    }
    return { success: false, message };
  }
};

export { loging, registerUser, logout };