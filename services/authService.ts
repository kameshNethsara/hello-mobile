import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const loging = async (email: string, password: string) => {
    console.log(email, password);
    return await signInWithEmailAndPassword(auth, email, password);
};

const registerUser = async (name: string, email: string, password: string) => {
    console.log(name, email, password);

    const userCred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(userCred.user, {
        displayName: name,
        photoURL: ""
    })
    
    //role
    //firestore(db)
    setDoc(doc(db, "users", userCred.user.uid), {
        name: name,
        role: "user",
        email: email,
        createAt: new Date()
    })
    return userCred.user
};

const logout = async () => {
    console.log("logout")
    await auth.signOut()
    AsyncStorage.clear()
    // AsyncStorage.setItem("key", {});
    // AsyncStorage.getItem("key");

    return
};

export { loging, registerUser, logout };