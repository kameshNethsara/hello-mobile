import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useLoader } from "@/hooks/useLoader";
import { auth } from "@/services/firebase";
import { listenToFollowers, listenToFollowing } from "@/services/followService";
import {
  deletePostCompletely,
  listenToMyPosts,
  Post,
} from "@/services/postsService";
import {
  decrementUserPosts,
  getCurrentUserDetails,
  User,
} from "@/services/userService";

export default function ProfileScreen() {
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  // const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showLoader, hideLoader, isLoading } = useLoader();

  // ── Load user profile ─────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!currentUser) return;

    try {
      // setLoading(true);
      showLoader();
      const userData = await getCurrentUserDetails();
      if (!userData) {
        Alert.alert("Error", "Profile not found. Please login again.");
        return;
      }
      // console.log(userData);
      setUser(userData);
    } catch (error) {
      // console.error("Profile load error:", error);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      // setLoading(false);
      hideLoader();
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    loadProfile();
  }, [currentUser, loadProfile]);

  // ── Real-time followers / following ───────────────
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubFollowers = listenToFollowers(currentUser.uid, (followers) =>
      setFollowersCount(followers.length),
    );
    const unsubFollowing = listenToFollowing(currentUser.uid, (following) =>
      setFollowingCount(following.length),
    );

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [currentUser?.uid]);

  // ── Real-time user posts ─────────────────────────
  useEffect(() => {
    // Only run if currentUser is available
    if (!currentUser?.uid) return;

    const unsubscribePosts = listenToMyPosts((posts) => {
      setPosts(posts);
    });

    return () => unsubscribePosts();
  }, [currentUser?.uid]);

  // useEffect(() => {
  //   const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
  //     if (user) {
  //       const unsubscribePosts = listenToMyPosts((posts) => setPosts(posts));
  //       // Clean up listener on logout
  //       return () => unsubscribePosts();
  //     } else {
  //       setPosts([]);
  //     }
  //   });

  //   return () => unsubscribeAuth();
  // }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  // // ── Delete post ─────────────────────────────────
  // const handleDeletePost = (postId: string) => {
  //   Alert.alert("Delete Post", "This action cannot be undone.", [
  //     { text: "Cancel", style: "cancel" },
  //     {
  //       text: "Delete",
  //       style: "destructive",
  //       onPress: async () => {
  //         try {
  //           setPosts((prev) => prev.filter((p) => p.id !== postId));
  //           await deletePostCompletely(postId);
  //         } catch (err) {
  //           // console.error("Delete failed:", err);
  //           Alert.alert("Error", "Could not delete post");
  //         }
  //       },
  //     },
  //   ]);
  // };

  const handleDeletePost = (postId: string) => {
    Alert.alert("Delete Post", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Don't manually update state here
            // let the listener handle it
            await deletePostCompletely(postId);

            // decrement user's post count
            if (currentUser) {
              await decrementUserPosts(currentUser.uid);
            }
          } catch (err) {
            Alert.alert("Error", "Could not delete post");
          }
        },
      },
    ]);
  };

  if (!currentUser) {
    return (
      <View style={styles.centered}>
        <Text style={styles.signInText}>Please sign in</Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={styles.loginButton}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // if (loading && !user) {
  //   return (
  //     <View style={styles.centered}>
  //       <ActivityIndicator size="large" color="#10b981" />
  //     </View>
  //   );
  // }

  if (isLoading && !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={posts}
      extraData={user}
      keyExtractor={(item) => item.id}
      numColumns={3}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.postItem}
          onPress={() =>
            router.push(`/(profile)/profile-post-details?id=${item.id}`)
          }
          onLongPress={() => handleDeletePost(item.id)}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.postImage}
            contentFit="cover"
          />
        </TouchableOpacity>
      )}
      ListHeaderComponent={
        <View style={styles.headerContainer}>
          <Text style={styles.username}>{user?.username || "User"}</Text>

          <View style={styles.avatarStatsRow}>
            <Image
              source={{
                uri:
                  user?.image ||
                  `https://ui-avatars.com/api/?name=${user?.fullname || "User"}&background=10b981&color=fff`,
              }}
              style={styles.avatar}
              contentFit="cover"
            />

            <View style={styles.statsRow}>
              <ProfileStat label="Posts" value={posts.length} />
              <ProfileStat label="Followers" value={followersCount} />
              <ProfileStat label="Following" value={followingCount} />
            </View>
          </View>

          <Text style={styles.fullname}>{user?.fullname || "Your Name"}</Text>
          <Text style={user?.bio ? styles.bio : styles.bioPlaceholder}>
            {user?.bio || "No bio yet"}
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/edit-profile")}
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={60} color="#4b5563" />
          <Text style={styles.emptyText}>No posts yet</Text>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statContainer}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },

  signInText: { color: "white", fontSize: 20, marginBottom: 16 },
  loginButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  loginButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },

  postItem: { flex: 1 / 3, aspectRatio: 1, padding: 1 },
  postImage: { flex: 1, borderRadius: 4 },

  headerContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  username: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },

  avatarStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "#27272a",
  },

  statsRow: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
    marginLeft: 20,
  },
  statContainer: { alignItems: "center" },
  statValue: { color: "white", fontSize: 22, fontWeight: "bold" },
  statLabel: { color: "#9ca3af", fontSize: 14 },

  fullname: { color: "white", fontSize: 16, fontWeight: "500" },
  bio: { color: "#d1d5db", marginTop: 4 },
  bioPlaceholder: { color: "#6b7280", fontStyle: "italic", marginTop: 4 },

  editButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#4ADE80",
    borderRadius: 8,
    paddingVertical: 12,
  },
  editButtonText: { color: "white", textAlign: "center" },

  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: "#9ca3af", fontSize: 18, marginTop: 12 },
});
