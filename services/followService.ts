import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";

const auth = getAuth();

// ---------------- FOLLOW USER ----------------
export const followUser = async (targetUserId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const followingRef = doc(
    db,
    "users",
    currentUser.uid,
    "following",
    targetUserId
  );

  const followerRef = doc(
    db,
    "users",
    targetUserId,
    "followers",
    currentUser.uid
  );

  await Promise.all([
    setDoc(followingRef, { createdAt: Timestamp.now() }),
    setDoc(followerRef, { createdAt: Timestamp.now() }),
  ]);
};

// ---------------- UNFOLLOW USER ----------------
export const unfollowUser = async (targetUserId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const followingRef = doc(
    db,
    "users",
    currentUser.uid,
    "following",
    targetUserId
  );

  const followerRef = doc(
    db,
    "users",
    targetUserId,
    "followers",
    currentUser.uid
  );

  await Promise.all([deleteDoc(followingRef), deleteDoc(followerRef)]);
};

// ---------------- CHECK FOLLOWING ----------------
export const isFollowing = async (targetUserId: string): Promise<boolean> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  const followingRef = doc(
    db,
    "users",
    currentUser.uid,
    "following",
    targetUserId
  );

  const snapshot = await getDoc(followingRef);
  return snapshot.exists();
};

// ---------------- FOLLOWER COUNT ----------------
export const getFollowerCount = async (userId: string): Promise<number> => {
  const followersCollection = collection(db, "users", userId, "followers");
  const snapshot = await getDocs(followersCollection);
  return snapshot.size;
};

// ---------------- FOLLOWING COUNT ----------------
export const getFollowingCount = async (userId: string): Promise<number> => {
  const followingCollection = collection(db, "users", userId, "following");
  const snapshot = await getDocs(followingCollection);
  return snapshot.size;
};

// ---------------- GET FOLLOWERS LIST ----------------
export const getFollowers = async (userId: string): Promise<string[]> => {
  const followersCollection = collection(db, "users", userId, "followers");
  const snapshot = await getDocs(followersCollection);
  return snapshot.docs.map((doc) => doc.id);
};

// ---------------- GET FOLLOWING LIST ----------------
export const getFollowing = async (userId: string): Promise<string[]> => {
  const followingCollection = collection(db, "users", userId, "following");
  const snapshot = await getDocs(followingCollection);
  return snapshot.docs.map((doc) => doc.id);
};

// ---------------- REAL-TIME FOLLOWERS ----------------export const listenToFollowers = (
export const listenToFollowers = (
  userId: string,
  callback: (followers: string[]) => void
) => {
  const followersCollection = collection(db, "users", userId, "followers");
  return onSnapshot(followersCollection, (snapshot: QuerySnapshot<DocumentData>) => {
    const followers = snapshot.docs.map((doc) => doc.id);
    callback(followers);
  });
};

// ---------------- REAL-TIME FOLLOWING ----------------
export const listenToFollowing = (
  userId: string,
  callback: (following: string[]) => void
) => {
  const followingCollection = collection(db, "users", userId, "following");
  return onSnapshot(followingCollection, (snapshot: QuerySnapshot<DocumentData>) => {
    const following = snapshot.docs.map((doc) => doc.id);
    callback(following);
  });
};
