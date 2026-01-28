import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { listenToBookMarkedPosts, Post } from "@/services/postsService";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { COLORS } from "@/constants/theme";
import { useLoader } from "@/hooks/useLoader";

export default function BookMark() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const { showLoader, hideLoader, isLoading } = useLoader()
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // ── Load bookmarked posts ─────────────────────
  useEffect(() => {
    showLoader();

    const unsubscribe = listenToBookMarkedPosts(async (savedPostIds) => {
      try {
        if (savedPostIds.length === 0) {
          setPosts([]);
          return;
        }

        const postPromises = savedPostIds.map(async (postId) => {
          const snap = await getDoc(doc(db, "posts", postId));
          if (!snap.exists()) return null;

          const data = snap.data();
          return {
            id: snap.id,
            userId: data.userId,
            imageUrl: data.imageUrl,
            caption: data.caption,
            likes: data.likes ?? 0,
            comments: data.comments ?? 0,
            createdAt: data.createdAt,
          } as Post;
        });

        const results = await Promise.all(postPromises);
        setPosts(results.filter(Boolean) as Post[]);
      } catch (error) {
        console.error("Bookmark load error:", error);
      } finally {
        hideLoader();
      }
    });

    return () => {
      unsubscribe();
      hideLoader(); // safety cleanup
    };
    }, []);
    
  // ── Load current user profile image ────────────
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) {
        setProfileImage(snap.data().image || null);
      }
    });
  }, []);

  // ── Loading state ──────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.grey }}>Loading saved posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookmarks</Text>

        <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
          <Image
            source={{
              uri:
                profileImage ||
                "https://ui-avatars.com/api/?name=User&background=10b981&color=fff",
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      {/* ── Bookmarked posts grid ── */}
      {posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: COLORS.grey }}>No bookmarked posts</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
          )}
          contentContainerStyle={{ padding: 2 }}
          showsVerticalScrollIndicator={false}
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
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#10b981",
  },

  image: {
    width: "33.33%",
    aspectRatio: 1,
    margin: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
