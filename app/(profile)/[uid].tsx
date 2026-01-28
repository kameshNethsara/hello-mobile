import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import {
  followUser,
  unfollowUser,
  isFollowing,           // ← using the correct imported function
  listenToFollowers,
  listenToFollowing,
} from "@/services/followService";
import { listenToUserPosts, Post } from "@/services/postsService";
import { getUserById, User } from "@/services/userService";
import { addNotification } from "@/services/notificationService";
import { COLORS } from "@/constants/theme";

export default function ExternalUserProfile() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const currentUserId = auth.currentUser?.uid;

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowingState, setIsFollowingState] = useState(false); // renamed to avoid name conflict
  const [refreshing, setRefreshing] = useState(false);

  const { showLoader, hideLoader, isLoading } = useLoader();

  // ── Load User Profile ─────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!uid) return;
    try {
      showLoader();
      const userData = await getUserById(uid);
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      hideLoader();
      setRefreshing(false);
    }
  }, [uid, showLoader, hideLoader]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Check if current user is following this profile ──
  useEffect(() => {
    if (!currentUserId || !uid || currentUserId === uid) return;

    const checkFollowStatus = async () => {
      try {
        const followingStatus = await isFollowing(uid); // ← correct usage
        setIsFollowingState(followingStatus);
      } catch (err) {
        console.error("Failed to check follow status:", err);
      }
    };

    checkFollowStatus();
  }, [uid, currentUserId]);

  // ── Real-time followers / following counts ────────
  useEffect(() => {
    if (!uid) return;

    const unsubFollowers = listenToFollowers(uid, (followers) =>
      setFollowersCount(followers.length)
    );

    const unsubFollowing = listenToFollowing(uid, (following) =>
      setFollowingCount(following.length)
    );

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [uid]);

  // ── Real-time user posts ──────────────────────────
  useEffect(() => {
    if (!uid) return;

    const unsubscribePosts = listenToUserPosts(uid, (newPosts) => {
      setPosts(newPosts);
    });

    return () => unsubscribePosts();
  }, [uid]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  // const handleFollowPress = async () => {
  //   if (!currentUserId || currentUserId === uid || !uid) return;

  //   try {
  //     if (isFollowingState) {
  //       await unfollowUser(uid);
  //       setIsFollowingState(false);
  //     } else {
  //       await followUser(uid);
  //       setIsFollowingState(true);
  //     }
  //   } catch (error) {
  //     Alert.alert("Error", "Could not update follow status");
  //   }
  // };
  const handleFollowPress = async () => {
    if (!currentUserId || currentUserId === uid || !uid) return;

    try {
      if (isFollowingState) {
        await unfollowUser(uid);
        setIsFollowingState(false);
      } else {
        await followUser(uid);
        setIsFollowingState(true);

        // Send follow notification
        await addNotification(uid, currentUserId, "follow");
      }
    } catch (error) {
      Alert.alert("Error", "Could not update follow status");
    }
  };

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
      keyExtractor={(item) => item.id}
      numColumns={3}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.postItem}
          onPress={() =>
            router.push(`/(profile)/profile-post-details?id=${item.id}`)
          }
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
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.username}>{user?.username || "Profile"}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.avatarStatsRow}>
            <Image
              source={{
                uri:
                  user?.image ||
                  `https://ui-avatars.com/api/?name=${user?.username || "User"}&background=10b981&color=fff`,
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

          <Text style={styles.fullname}>{user?.fullname || "User Name"}</Text>
          <Text style={user?.bio ? styles.bio : styles.bioPlaceholder}>
            {user?.bio || "No bio yet"}
          </Text>

          {currentUserId !== uid ? (
            <TouchableOpacity
              onPress={handleFollowPress}
              style={[
                styles.editButton,
                isFollowingState ? styles.followingBtn : styles.followBtn,
              ]}
            >
              <Text style={styles.editButtonText}>
                {isFollowingState ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/edit-profile")}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={60} color="#4b5563" />
          <Text style={styles.emptyText}>No posts yet</Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#10b981"
        />
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
  
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  
  postItem: { flex: 1 / 3, aspectRatio: 1, padding: 1 },
  postImage: { flex: 1, borderRadius: 4 },
  
  headerContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  username: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
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
  editButtonText: { color: "white", textAlign: "center", fontWeight: "500" },
  
  followBtn: { backgroundColor: "#10b981", borderColor: "#10b981" },
  followingBtn: { backgroundColor: "transparent", borderColor: "#4ADE80" },
  
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: "#9ca3af", fontSize: 18, marginTop: 12 },

});