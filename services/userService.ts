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
export const getCurrentUserDetails = async (): Promise<User | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  // Temporary version without orderBy
  const q = query(
    usersCollection,
    where("userId", "==", user.uid)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  // Take the most recent one manually (not ideal but works)
  const docs = snapshot.docs;
  const mostRecent = docs.reduce((prev, current) => {
    return (prev.data().createdAt?.toMillis() || 0) > (current.data().createdAt?.toMillis() || 0)
      ? prev
      : current;
  });

  const data = mostRecent.data();

  return {
    id: mostRecent.id,
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
