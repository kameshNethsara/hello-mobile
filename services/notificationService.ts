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
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ---------------- NOTIFICATION INTERFACE ----------------
export interface Notification {
  id: string;
  receiverId: string;
  senderId: string;
  type: "like" | "comment" | "follow";
  postId?: string;
  commentId?: string;
  createdAt: any;
  read?: boolean;
}

// Notifications collection
const notificationsCollection = collection(db, "notifications");

// ---------------- ADD NOTIFICATION ----------------
export const addNotification = async (
  receiverId: string,
  senderId: string,
  type: "like" | "comment" | "follow",
  postId?: string,
  commentId?: string
) => {
  await addDoc(notificationsCollection, {
    receiverId,
    senderId,
    type,
    postId: postId ?? null,
    commentId: commentId ?? null,
    createdAt: Timestamp.now(),
    read: false, // mark as unread by default
  });
};

// ---------------- GET NOTIFICATIONS FOR USER ----------------
export const getUserNotifications = async (
  userId: string
): Promise<Notification[]> => {
  const q = query(
    notificationsCollection,
    where("receiverId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      receiverId: data.receiverId,
      senderId: data.senderId,
      type: data.type,
      postId: data.postId,
      commentId: data.commentId,
      createdAt: data.createdAt,
      read: data.read ?? false,
    };
  });
};

// ---------------- MARK NOTIFICATION AS READ ----------------
export const markNotificationAsRead = async (notificationId: string) => {
  const notifRef = doc(db, "notifications", notificationId);
  await updateDoc(notifRef, { read: true });
};

// ---------------- DELETE NOTIFICATION ----------------
export const deleteNotification = async (notificationId: string) => {
  const notifRef = doc(db, "notifications", notificationId);
  await deleteDoc(notifRef);
};

// ---------------- REAL-TIME NOTIFICATIONS ----------------
export const listenToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
) => {
  const q = query(
    notificationsCollection,
    where("receiverId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        receiverId: data.receiverId,
        senderId: data.senderId,
        type: data.type,
        postId: data.postId,
        commentId: data.commentId,
        createdAt: data.createdAt,
        read: data.read ?? false,
      };
    });

    callback(notifications);
  });
};
