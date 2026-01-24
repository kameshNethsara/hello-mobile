import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";

const auth = getAuth();
const usersCollection = collection(db, "users");
import { deletePostCompletely } from "./postsService";
import { getFollowing, getFollowers } from "./followService"; 

// ---------------- USER INTERFACE ----------------
export interface User {
  id: string;
  userId: string; // auth uid
  username: string;
  fullname: string;
  email: string;
  bio: string;
  image: string;
  followers: number;
  following: number;
  posts: number;
  createdAt: any;
}

// ---------------- ADD USER ----------------
export const addUserDetails = async (
  username: string,
  fullname: string,
  email: string,
  bio: string,
  image: string
) => {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(usersCollection, {
    username,
    fullname,
    email,
    bio,
    image,
    followers: 0,
    following: 0,
    posts: 0,
    userId: user.uid,
    createdAt: Timestamp.now(),
  });
};

// ---------------- GET CURRENT USER DETAILS ----------------
// export const getCurrentUserDetails = async (): Promise<User | null> => {
//   // const user = auth.currentUser;
//   // if (!user) return null;

//   // // Temporary version without orderBy
//   // const q = query(
//   //   usersCollection,
//   //   where("userId", "==", user.uid)
//   // );

//   // const snapshot = await getDocs(q);
//   // if (snapshot.empty) return null;
//   const user = auth.currentUser;
//   if (!user) {
//     console.log("No authenticated user");
//     return null;
//   }

//   const q = query(usersCollection, where("userId", "==", user.uid));
//   const snapshot = await getDocs(q);

//   console.log(`Found ${snapshot.size} documents for uid: ${user.uid}`);

//   if (snapshot.empty) {
//     console.log("No user document found → needs to be created");
//     return null;
//   }

//   // Take the most recent one manually (not ideal but works)
//   const docs = snapshot.docs;
//   const mostRecent = docs.reduce((prev, current) => {
//     return (prev.data().createdAt?.toMillis() || 0) > (current.data().createdAt?.toMillis() || 0)
//       ? prev
//       : current;
//   });

//   const data = mostRecent.data();

//   return {
//     id: mostRecent.id,
//     userId: data.userId,
//     username: data.username,
//     fullname: data.fullname,
//     email: data.email,
//     bio: data.bio,
//     image: data.image,
//     followers: data.followers,
//     following: data.following,
//     posts: data.posts,
//     createdAt: data.createdAt,
//   };
// };

export const getCurrentUserDetails = async (): Promise<User | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    // console.log("No user document found");
    return null;
  }

  const data = docSnap.data();

  return {
    id: docSnap.id,
    userId: user.uid,
    username: data.username,
    fullname: data.fullname,
    email: data.email,
    bio: data.bio,
    image: data.image,
    followers: data.followers,
    following: data.following,
    posts: data.posts,
    createdAt: data.createdAt,
  };
};

// ---------------- GET ALL USERS ----------------
export const getAllUsersDetails = async (): Promise<User[]> => {
  const snapshot = await getDocs(query(usersCollection, orderBy("createdAt", "desc")));

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      username: data.username,
      fullname: data.fullname,
      email: data.email,
      bio: data.bio,
      image: data.image,
      followers: data.followers,
      following: data.following,
      posts: data.posts,
      createdAt: data.createdAt,
    };
  });
};

// ---------------- UPDATE USER PROFILE ----------------
export const updateUserDetails = async (
  userId: string,
  updates: Partial<Omit<User, "id" | "userId" | "createdAt">>
) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, updates);
};

// ---------------- DELETE USER ----------------
export const deleteUser = async (userId: string) => {
  const userRef = doc(db, "users", userId);

  // 1️⃣ Delete all posts by this user
  const postsRef = collection(db, "posts");
  const q = query(postsRef, where("userId", "==", userId));
  const postsSnapshot = await getDocs(q);
  const deletePostsPromises = postsSnapshot.docs.map((postDoc) =>
    deletePostCompletely(postDoc.id)
  );
  await Promise.all(deletePostsPromises);

  // 2️⃣ Remove this user from other users' followers/following
  const followers = await getFollowers(userId); // array of userIds
  const following = await getFollowing(userId);

  const removeFromFollowers = followers.map(async (followerId) => {
    await deleteDoc(doc(db, "users", followerId, "following", userId));
  });

  const removeFromFollowing = following.map(async (followingId) => {
    await deleteDoc(doc(db, "users", followingId, "followers", userId));
  });

  await Promise.all([...removeFromFollowers, ...removeFromFollowing]);

  // 3️⃣ Delete the user document itself
  await deleteDoc(userRef);
};

// ---------------- REAL-TIME USER LISTEN ----------------
export const listenToUsers = (
  callback: (users: User[]) => void
) => {
  return onSnapshot(query(usersCollection, orderBy("createdAt", "desc")), (snapshot) => {
    const users: User[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        username: data.username,
        fullname: data.fullname,
        email: data.email,
        bio: data.bio,
        image: data.image,
        followers: data.followers,
        following: data.following,
        posts: data.posts,
        createdAt: data.createdAt,
      };
    });
    callback(users);
  });
};

const userCache = new Map<string, any>();

export const getUserByIdForHome = async (userId: string) => {
  if (userCache.has(userId)) {
    return userCache.get(userId);
  }

  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return null;

  const user = snap.data();
  const data = {
    username: user.username,
    avatar: user.image,
  };

  userCache.set(userId, data);
  return data;
};

export const getUserById = async (userId: string): Promise<User | null> => {
  // Check Cache
  if (userCache.has(userId)) {
    return userCache.get(userId);
  }

  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return null;

  const data = snap.data();
  
  // Construct the full User object
  const userDetails: User = {
    id: snap.id,
    userId: data.userId,
    username: data.username,
    fullname: data.fullname, // Now correctly included
    email: data.email,
    bio: data.bio,           // Now correctly included
    image: data.image,       // Kept as 'image' to match your UI
    followers: data.followers ?? 0,
    following: data.following ?? 0,
    posts: data.posts ?? 0,
    createdAt: data.createdAt,
  };

  // Save to Cache
  userCache.set(userId, userDetails);
  
  return userDetails;
};