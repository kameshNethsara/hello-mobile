import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";

const auth = getAuth();

/* ───────── INTERFACE ───────── */

export interface Comment {
  id: string;
  userId: string;
  username?: string; 
  content: string;
  createdAt: any;
  updatedAt?: any;
}

/* ───────── ADD COMMENT ───────── */

// export const addComment = async (postId: string, content: string) => {
//   const user = auth.currentUser;
//   if (!user || !content.trim()) return;

//   try {
//     const newComment = {
//       userId: user.uid,
//       username: user.displayName || "User",
//       content,
//       createdAt: new Date(),        // local timestamp for instant UI
//       serverTimestamp: serverTimestamp(), // real server timestamp
//     };

//     await addDoc(collection(db, "posts", postId, "comments"), newComment);

//     // increment comment count
//     await updateDoc(doc(db, "posts", postId), {
//       comments: increment(1),
//     });
//   } catch (err) {
//     console.error("Add comment failed", err);
//   }
// };

export const addComment = async (postId: string, content: string) => {
  const user = auth.currentUser;
  if (!user) {
    // console.log("No user logged in!");
    return;
  }
  if (!content.trim()) {
    // console.log("Empty comment, skipping");
    return;
  }

  try {
    await addDoc(collection(db, "posts", postId, "comments"), {
      userId: user.uid,
      username: user.displayName || "User",
      content,
      createdAt: serverTimestamp(),
    });

    // console.log("Comment added successfully!");
    await updateDoc(doc(db, "posts", postId), { comments: increment(1) });
  } catch (err) {
    // console.error("Add comment failed:", err);
  }
};


/* ───────── DELETE COMMENT ───────── */

export const deleteComment = async (
  postId: string,
  commentId: string
) => {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "posts", postId, "comments", commentId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;
  if (snap.data().userId !== user.uid) return;

  try {
    await deleteDoc(ref);

    // decrement comment count
    await updateDoc(doc(db, "posts", postId), {
      comments: increment(-1),
    });
  } catch (err) {
    console.error("Delete comment failed", err);

  }
};

/* ───────── EDIT COMMENT ───────── */

export const editComment = async (
  postId: string,
  commentId: string,
  newContent: string
) => {
  const user = auth.currentUser;
  if (!user || !newContent.trim()) return;

  const ref = doc(db, "posts", postId, "comments", commentId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;
  if (snap.data().userId !== user.uid) return;

  try {
    await updateDoc(ref, {
      content: newContent,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Edit comment failed", err);
  }
};

/* ───────── REAL-TIME COMMENTS ───────── */
export const listenToComments = (postId: string, callback: (comments: Comment[]) => void) => {
  const commentsRef = collection(db, "posts", postId, "comments");
  const q = query(commentsRef, orderBy("createdAt", "asc")); // order by oldest → newest
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const comments: Comment[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[];
    callback(comments);
  });

  return unsubscribe;
};
// listen to comments count
export const listenToPostComments = (
  postId: string,
  callback: (count: number) => void
) => {
  const commentsRef = collection(db, "posts", postId, "comments");

  const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
    callback(snapshot.size); // total number of docs = comments count
  });

  return unsubscribe;
};



