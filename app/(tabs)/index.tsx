import { COLORS } from "@/constants/theme";
import { useLoader } from "@/hooks/useLoader";
import { logout } from "@/services/authService";
import { listenToPostComments } from "@/services/commentsService";
import { addNotification } from "@/services/notificationService";
import {
  bookMarkedPost,
  listenToBookMarkedPosts,
  listenToPostLikes,
  listenToPosts,
  Post,
  toggleLikePost,
  unBookMarkedPost,
} from "@/services/postsService";
import { getUserByIdForHome } from "@/services/userService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Index() {
  const router = useRouter();
  const { width } = Dimensions.get("window");

  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<
    Record<string, { username: string; fullname?: string; avatar: string }>
  >({});

  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  const [refreshing, setRefreshing] = useState(false);
  const { showLoader, hideLoader, isLoading } = useLoader();

  const [error, setError] = useState<string | null>(null);

  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [savedBookMarkedPosts, setSavedBookMarkedPosts] = useState<Record<string, boolean>>({});

  const [commentsCount, setCommentsCount] = useState<Record<string, number>>({});

  const toggleExpanded = (postId: string) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  // Real-time posts listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        showLoader();
        unsubscribe = listenToPosts((freshPosts) => {
          setPosts(freshPosts);

          const missing = freshPosts
            .map((p) => p.userId)
            .filter((id) => id && !users[id]);

          if (missing.length > 0) loadMissingUsers(missing);
        });
      } catch (error) {
        console.error("Failed to listen to posts:", error);
        setError("Failed to load posts");
      } finally {
        hideLoader();
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Load missing user data
  const loadMissingUsers = async (uids: string[]) => {
    const unique = [...new Set(uids)];
    const newData: typeof users = {};

    await Promise.allSettled(
      unique.map(async (uid) => {
        try {
          const u = await getUserByIdForHome(uid);
          if (u) newData[uid] = u;
        } catch { }
      }),
    );

    if (Object.keys(newData).length > 0) {
      setUsers((prev) => ({ ...prev, ...newData }));
    }
  };

  // Real-time likes per post
  useEffect(() => {
    if (posts.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    posts.forEach((post) => {
      const unsub = listenToPostLikes(post.id, (count, likedByMe) => {
        setLikesCount((prev) => ({ ...prev, [post.id]: count }));
        setLikedPosts((prev) => ({ ...prev, [post.id]: likedByMe }));
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach((u) => u());
  }, [posts]);

  // Real-time comments count per post
  useEffect(() => {
    if (posts.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    posts.forEach((post) => {
      const unsub = listenToPostComments(post.id, (count) => {
        setCommentsCount((prev) => ({ ...prev, [post.id]: count }));
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach((u) => u());
  }, [posts]);

  // Real-time bookmarked posts
  useEffect(() => {
    const unsubscribe = listenToBookMarkedPosts((savedPostIds) => {
      const savedStatus: Record<string, boolean> = {};
      savedPostIds.forEach((id) => {
        savedStatus[id] = true;
      });
      setSavedBookMarkedPosts(savedStatus);
    });

    return () => unsubscribe();
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  const signOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.push("/(auth)/login");
          } catch (err) {
            console.error("Logout failed", err);
          }
        },
      },
    ]);
  };

  // ─── Render single post ─────────────────────
  const renderPost = ({ item }: { item: Post }) => {
    const userInfo = users[item.userId];
    const username = userInfo?.username || "…";
    const fullname = userInfo?.fullname || username;
    const avatar =
      userInfo?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        fullname || "User"
      )}&background=333&color=fff`;

    const user = { username, avatar };

    const commentCount = commentsCount[item.id] ?? 0;

    return (
      <View style={styles.post}>
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: "100%", aspectRatio: 1 }}
            resizeMode="cover"
          />

          <TouchableOpacity
            style={styles.overlayHeader}
            onPress={() =>
              router.push({
                pathname: "/(profile)/[uid]",
                params: { uid: item.userId },
              })
            }
          >
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <Text style={styles.overlayUsername}>{user.username}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.postActions}>
          {/* Left side: Like + Comment */}
          <View style={styles.actionsLeft}>
            {/* Like */}
            {/* <TouchableOpacity
              onPress={() =>
                toggleLikePost(
                  item.id,
                  (isLiked) => setLikedPosts((p) => ({ ...p, [item.id]: isLiked })),
                  (count) => setLikesCount((p) => ({ ...p, [item.id]: count })),
                )
              }
            >
              <Ionicons
                name={likedPosts[item.id] ? "heart" : "heart-outline"}
                size={28}
                color={likedPosts[item.id] ? "#ff3366" : "#fff"}
              />
            </TouchableOpacity> */}
            {/* Like */}
            <TouchableOpacity
              onPress={async () => {
                toggleLikePost(
                  item.id,
                  async (isLiked) => {
                    setLikedPosts((p) => ({ ...p, [item.id]: isLiked }));

                    // ✅ Add notification only if user liked the post (not unliked)
                    // and the liker is not the post owner
                    const currentUserId = getAuth().currentUser?.uid;
                    if (isLiked && item.userId !== currentUserId) {
                      try {
                        await addNotification(item.userId, currentUserId!, "like", item.id);
                      } catch (err) {
                        console.error("Failed to add like notification:", err);
                      }
                    }
                  },
                  (count) => setLikesCount((p) => ({ ...p, [item.id]: count }))
                );
              }}
            >
              <Ionicons
                name={likedPosts[item.id] ? "heart" : "heart-outline"}
                size={28}
                color={likedPosts[item.id] ? "#ff3366" : "#fff"}
              />
            </TouchableOpacity>

            <Text style={styles.likesText}>
              {likesCount[item.id] ?? item.likes ?? 0} likes
            </Text>

            {/* Comment */}
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(comments)/[postId]",
                  params: { postId: item.id },
                })
              }
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name={commentCount > 0 ? "chatbubble-ellipses" : "chatbubble-outline"}
                size={28}
                color={commentCount > 0 ? "#40C4FF" : "#ccc"}
              />

              <Text
                style={[
                  styles.likesText,
                  {
                    // fontSize: 15,
                    color: commentCount > 0 ? "#fff" : COLORS.white,
                    // fontWeight: commentCount > 0 ? "800" : "700",
                    left: 2,
                  },
                ]}
              >
                {commentCount} comments
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right side: Bookmark */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={async () => {
              if (savedBookMarkedPosts[item.id]) {
                await unBookMarkedPost(item.id);
              } else {
                await bookMarkedPost(item.id);
              }
              setSavedBookMarkedPosts((prev) => ({
                ...prev,
                [item.id]: !prev[item.id],
              }));
            }}
          >
            <Ionicons
              name={savedBookMarkedPosts[item.id] ? "bookmark" : "bookmark-outline"}
              size={26}
              color={savedBookMarkedPosts[item.id] ? "#FFD700" : "#fff"}
            />
          </TouchableOpacity>
        </View>

        {item.caption ? (
          <View style={styles.postInfo}>
            <Text style={styles.captionText}>
              <Text style={{ fontWeight: "700" }}>{user.username} </Text>
              {expandedPosts[item.id]
                ? item.caption
                : item.caption?.slice(0, 100) +
                (item.caption?.length > 100 ? "..." : "")}
            </Text>

            {item.caption?.length > 100 && (
              <TouchableOpacity onPress={() => toggleExpanded(item.id)}>
                <Text
                  style={{
                    color: COLORS.primary,
                    fontWeight: "600",
                    marginTop: 4,
                  }}
                >
                  {expandedPosts[item.id] ? "Read less" : "Read more"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  // ─── Main return ───────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>H e l l o</Text>
        <TouchableOpacity onPress={signOut}>
          <Ionicons name="log-out-outline" size={26} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={{ color: "#ff5555", marginBottom: 16 }}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.grey, marginTop: 12 }}>
            Loading posts...
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: -0.3,
  },

  post: {
    marginBottom: 20,
  },

  overlayHeader: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#fff",
  },

  overlayUsername: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  postActions: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionsLeft: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
  },
  saveBtn: {
    padding: 4,
  },
  postInfo: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  likesText: {
    color: COLORS.white,
    fontWeight: "700",
    marginBottom: 4,
    left: -12,
  },
  captionText: {
    color: COLORS.white,
    lineHeight: 20,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});