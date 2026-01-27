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
  serverTimestamp,
  increment,
  runTransaction,
  DocumentData,
  QueryDocumentSnapshot,
  startAfter,
  limit,
  setDoc,
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
  createdAt: Timestamp; // better to keep as Timestamp
}

// For pagination
export interface PostsPage {
  posts: Post[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

// ---------------- ADD POST ----------------
export const addPost = async (imageUrl: string, caption?: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  await addDoc(postsCollection, {
    userId: user.uid,
    imageUrl,
    caption: caption ?? "",
    likes: 0,
    comments: 0,
    createdAt: serverTimestamp(),
  });
};

// ---------------- FETCH RECENT POSTS (for home feed) ----------------
// Non-realtime — use pagination
export const fetchPosts = async (
  pageSize: number = 10,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null
): Promise<PostsPage> => {
  let q = query(
    postsCollection,
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(
      postsCollection,
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }

  const snapshot = await getDocs(q);

  const posts: Post[] = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      caption: data.caption,
      likes: data.likes ?? 0,
      comments: data.comments ?? 0,
      createdAt: data.createdAt,
    };
  });

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;

  return { posts, lastDoc: newLastDoc };
};

// ---------------- GET CURRENT USER POSTS (one-time) ----------------
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
      likes: data.likes ?? 0,
      comments: data.comments ?? 0,
      createdAt: data.createdAt,
    };
  });
};

// ---------------- REAL-TIME FOR CURRENT USER POSTS ----------------
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
        likes: data.likes ?? 0,
        comments: data.comments ?? 0,
        createdAt: data.createdAt,
      };
    });
    callback(posts);
  });

  return unsubscribe;
};

// ---------------- DELETE POST + SUBCOLLECTIONS ----------------
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
  if (!snapshot.exists() || snapshot.data()?.userId !== user.uid) return;

  // Delete subcollections
  await deleteSubcollection(postId, "comments");
  await deleteSubcollection(postId, "likes");

  // Delete the post itself
  await deleteDoc(postRef);
};

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

// ---------------- EDIT CAPTION ----------------
export const editPostCaption = async (postId: string, newCaption: string) => {
  const user = auth.currentUser;
  if (!user) return;

  const postRef = doc(db, "posts", postId);
  const snapshot = await getDoc(postRef);
  if (!snapshot.exists() || snapshot.data()?.userId !== user.uid) return;

  await updateDoc(postRef, {
    caption: newCaption,
    updatedAt: serverTimestamp(),
  });
};

// ---------------- TOGGLE LIKE (transaction-safe) ----------------
export const toggleLikePost = async (
  postId: string,
  onLikeChange: (isLiked: boolean) => void,
  onCountChange: (newCount: number) => void
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  const likeRef = doc(db, "posts", postId, "likes", user.uid);
  const postRef = doc(db, "posts", postId);

  await runTransaction(db, async (transaction) => {
    const likeSnap = await transaction.get(likeRef);
    const postSnap = await transaction.get(postRef);

    if (!postSnap.exists()) throw new Error("Post not found");

    const currentlyLiked = likeSnap.exists();

    if (currentlyLiked) {
      // Unlike
      transaction.delete(likeRef);
      transaction.update(postRef, { likes: increment(-1) });
      onLikeChange(false);
      onCountChange((postSnap.data()?.likes ?? 1) - 1);
    } else {
      // Like
      transaction.set(likeRef, { timestamp: serverTimestamp() });
      transaction.update(postRef, { likes: increment(1) });
      onLikeChange(true);
      onCountChange((postSnap.data()?.likes ?? 0) + 1);
    }
  });
};

// ---------------- REAL-TIME POST LIKE COUNT + USER LIKE STATUS ----------------
export function listenToPostLikes(
  postId: string,
  callback: (likesCount: number, likedByCurrentUser: boolean) => void
) {
  const user = auth.currentUser;
  if (!user) {
    callback(0, false);
    return () => {};
  }

  const postRef = doc(db, "posts", postId);
  const likeRef = doc(db, "posts", postId, "likes", user.uid);

  // We use two listeners — cheap because it's per-post
  const unsubPost = onSnapshot(postRef, (snap) => {
    if (snap.exists()) {
      const likes = snap.data()?.likes ?? 0;
      // We'll get the like status from the other listener
      // But to avoid race, we can trigger callback here too
    }
  });

  const unsubLike = onSnapshot(likeRef, (snap) => {
    const liked = snap.exists();
    getDoc(postRef).then((postSnap) => {
      const count = postSnap.exists() ? postSnap.data()?.likes ?? 0 : 0;
      callback(count, liked);
    });
  });

  return () => {
    unsubPost();
    unsubLike();
  };
}

// ---------------- REAL-TIME FOR A SPECIFIC USER'S POSTS ----------------
// Accept a targetUid so we can view other people's profiles
export const listenToUserPosts = (
  targetUid: string, 
  callback: (posts: Post[]) => void
) => {
  // We don't check for auth.currentUser here because we want 
  // to see public posts even if the target isn't "me".
  if (!targetUid) return () => {};

  const q = query(
    postsCollection,
    where("userId", "==", targetUid),
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
        likes: data.likes ?? 0,
        comments: data.comments ?? 0,
        createdAt: data.createdAt,
      };
    });
    callback(posts);
  });

  return unsubscribe;
};


// BookMarked a post
export const bookMarkedPost = async (postId: string) => {
  const user = auth.currentUser;
  if (!user) return;

  // Ensure user doc exists
  await setDoc(doc(db, "users", user.uid), { createdAt: serverTimestamp() }, { merge: true });

  // Save bookmark
  const ref = doc(db, "users", user.uid, "bookmarks", postId);
  await setDoc(ref, { savedAt: serverTimestamp() });
};

// Unsave a post
export const unBookMarkedPost = async (postId: string) => {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid, "bookmarks", postId);
  await deleteDoc(ref);
};

// Check if post is saved
export const isBookMarkedPostSaved = async (postId: string): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;

  const ref = doc(db, "users", user.uid, "bookmarks", postId);
  const snap = await getDoc(ref);
  return snap.exists();
};

// ---------------- REAL-TIME BOOKMARK LISTENER ----------------
export const listenToBookMarkedPosts = (
  callback: (savedPostIds: string[]) => void
) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  const bookmarksCol = collection(db, "users", user.uid, "bookmarks");
  const q = query(bookmarksCol);

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const savedPostIds = snapshot.docs.map((doc) => doc.id);
    callback(savedPostIds);
  });

  return unsubscribe;
};