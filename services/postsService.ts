import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  deleteDoc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";

const auth = getAuth();
const postsCollection = collection(db, "posts");

// ---------------- POST INTERFACE ----------------
export interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  likes: number;
  comments: number;
  createdAt: any;
}

// ---------------- ADD POST ----------------
export const addPost = async (
  imageUrl: string,
  caption?: string
) => {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(postsCollection, {
    userId: user.uid,
    imageUrl,
    caption: caption ?? "",
    likes: 0,
    comments: 0,
    createdAt: Timestamp.now(),
  });
};

// ---------------- GET POSTS (CURRENT USER) ----------------
export const getMyPosts = async (): Promise<Post[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    postsCollection,
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      caption: data.caption,
      likes: data.likes,
      comments: data.comments,
      createdAt: data.createdAt,
    };
  });
};

//---------------- Create Current User Post Real Time Update Using Snapshot ----------------
export const listenToMyPosts = (callback: (posts: Post[]) => void) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  const q = query(
    postsCollection,
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const posts: Post[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        imageUrl: data.imageUrl,
        caption: data.caption,
        likes: data.likes,
        comments: data.comments,
        createdAt: data.createdAt,
      };
    });
    callback(posts);
  });

  return unsubscribe;
};
//------------------D E L E T E  P O S T------------------
// ---------------- DELETE SUBCOLLECTION ----------------
const deleteSubcollection = async (postId: string, subcollectionName: string) => {
  const subColRef = collection(db, "posts", postId, subcollectionName);
  const snapshot = await getDocs(subColRef);

  const deletePromises = snapshot.docs.map((docSnap) =>
    deleteDoc(doc(db, "posts", postId, subcollectionName, docSnap.id))
  );

  await Promise.all(deletePromises);
};

// ---------------- DELETE POST COMPLETELY ----------------
export const deletePostCompletely = async (postId: string) => {
  const user = auth.currentUser;
  if (!user) return;

  const postRef = doc(db, "posts", postId);
  const snapshot = await getDoc(postRef);
  if (!snapshot.exists()) return;

  // Only allow owner to delete
  if (snapshot.data().userId !== user.uid) return;

  // Delete subcollections
  await deleteSubcollection(postId, "comments");
  await deleteSubcollection(postId, "likes");

  // Delete the post itself
  await deleteDoc(postRef);
};
//--------------------------------------------------------

// ---------------- REAL-TIME POSTS ----------------
export const listenToPosts = (
  callback: (posts: Post[]) => void
) => {
  const q = query(postsCollection, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        imageUrl: data.imageUrl,
        caption: data.caption,
        likes: data.likes,
        comments: data.comments,
        createdAt: data.createdAt,
      };
    });
    callback(posts);
  });
};

// ---------------- UPDATE POST (e.g., edit caption) ----------------
export const editPostCaption = async (postId: string, newCaption: string) => {
  const user = auth.currentUser;
  if (!user) return;

  const postRef = doc(db, "posts", postId);
  const snapshot = await getDoc(postRef);
  if (!snapshot.exists()) return;

  // Only allow owner to edit
  if (snapshot.data().userId !== user.uid) return;

  await updateDoc(postRef, {
    caption: newCaption,
    updatedAt: Timestamp.now(),
  });
};
