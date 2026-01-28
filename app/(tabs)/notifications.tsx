import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "@/services/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { useLoader } from "@/hooks/useLoader";
import { COLORS } from "@/constants/theme";
import { deleteNotification } from "@/services/notificationService";

type NotificationType = "follow" | "like" | "comment";

interface Notification {
  id: string;
  type: NotificationType;
  fromUserId: string;
  postId?: string;
  createdAt: Timestamp;
  read: boolean;
  fromUsername?: string;
  fromAvatar?: string;
  postImage?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  // const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showLoader, hideLoader, isLoading } = useLoader();

  useEffect(() => {
    if (!currentUser?.uid) return;

    showLoader();

    const q = query(
      collection(db, "notifications"),
      where("receiverId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(40)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const notifs = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();

          const notif: Notification = {
            id: docSnap.id,
            type: data.type,
            fromUserId: data.senderId,
            postId: data.postId,
            createdAt: data.createdAt,
            read: data.read || false,
          };

          // Fetch user info
          try {
            const userDoc = await getDoc(doc(db, "users", notif.fromUserId));
            if (userDoc.exists()) {
              const u = userDoc.data();
              notif.fromUsername = u.username || "User";
              notif.fromAvatar =
                u.image ||
                `https://ui-avatars.com/api/?name=${u.username || "User"}&background=10b981&color=fff`;
            }
          } catch (err) {
            console.error("Error fetching user info:", err);
          }

          // Fetch post image for likes/comments
          if ((notif.type === "like" || notif.type === "comment") && notif.postId) {
            try {
              const postDoc = await getDoc(doc(db, "posts", notif.postId));
              if (postDoc.exists()) notif.postImage = postDoc.data().imageUrl;
            } catch (err) {
              console.error("Error fetching post image:", err);
            }
          }

          return notif;
        }));

        setNotifications(notifs);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        hideLoader(); // loader hide karanna guarantee
      }
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const getNotificationText = (notif: Notification) => {
    const name = notif.fromUsername || "Someone";
    switch (notif.type) {
      case "follow": return `${name} started following you`;
      case "like": return `${name} liked your post`;
      case "comment": return `${name} commented on your post`;
      default: return "New activity";
    }
  };

  const handlePress = (notif: Notification) => {
    if ((notif.type === "like" || notif.type === "comment") && notif.postId) {
      router.push({ pathname: "/(profile)/profile-post-details", params: { id: notif.postId } });
    } else if (notif.type === "follow") {
      router.push({ pathname: "/(profile)/[uid]", params: { uid: notif.fromUserId } });
    }
  };

  // const renderNotification = ({ item }: { item: Notification }) => (
  //   <TouchableOpacity
  //     style={[styles.item, !item.read && styles.unread]}
  //     onPress={() => handlePress(item)}
  //   >
  //     <Image source={{ uri: item.fromAvatar }} style={styles.avatar} />
  //     <View style={styles.content}>
  //       <Text style={styles.message}>{getNotificationText(item)}</Text>
  //       <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
  //     </View>
  //     {item.postImage && <Image source={{ uri: item.postImage }} style={styles.postPreview} />}
  //     {!item.read && <View style={styles.unreadDot} />}
  //   </TouchableOpacity>
  // );
  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.unread]}
      onPress={() => handlePress(item)}
    >
      <Image source={{ uri: item.fromAvatar }} style={styles.avatar} />
      <View style={styles.content}>
        <Text style={styles.message}>{getNotificationText(item)}</Text>
        <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
      {item.postImage && <Image source={{ uri: item.postImage }} style={styles.postPreview} />}
      {!item.read && <View style={styles.unreadDot} />}
      
      {/* Delete button */}
      <TouchableOpacity
        onPress={async () => {
          await deleteNotification(item.id);  // call firebase delete
          setNotifications(prev => prev.filter(n => n.id !== item.id)); // locally remove
        }}
        style={{ marginLeft: 10 }}
      >
        <Ionicons name="trash-outline" size={22} color="red" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.grey, marginTop: 12 }}>
            Loading notifications...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={60} color="#4b5563" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        />
      )}
    </View>
  );
}

function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return "";
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#27272a" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: COLORS.primary },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 16 },
  item: { flexDirection: "row", padding: 12, alignItems: "center" },
  unread: { backgroundColor: "rgba(74, 222, 128, 0.05)" },
  avatar: { width: 46, height: 46, borderRadius: 23, marginRight: 14 },
  content: { flex: 1 },
  message: { color: "white", fontSize: 15 },
  time: { color: "#9ca3af", fontSize: 13, marginTop: 4 },
  postPreview: { width: 44, height: 44, borderRadius: 6, marginLeft: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 10 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});