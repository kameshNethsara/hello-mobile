import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "@/services/firebase";
import { useLoader } from "@/hooks/useLoader";
import { 
  editPostCaption, 
  listenToPostLikes,
  Post,
  toggleLikePost,
} from "@/services/postsService";
import { listenToPostComments } from "@/services/commentsService";  // ← import this!
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [owner, setOwner] = useState<any>(null);

  const isOwner = auth.currentUser?.uid === post?.userId;

  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");
  const [charCount, setCharCount] = useState(0);

  const CAPTION_LIMIT = 250;
  const [expanded, setExpanded] = useState(false);

  const { showLoader, hideLoader, isLoading } = useLoader();

  // Likes
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  // Comments count ← new
  const [commentsCount, setCommentsCount] = useState<number>(0);

  // ── Real-time Likes ───────────────────────────────
  useEffect(() => {
    if (!post?.id) return;

    const unsubscribe = listenToPostLikes(post.id, (count, likedByMe) => {
      setLikesCount({ [post.id]: count });
      setLikedPosts({ [post.id]: likedByMe });
    });

    return () => unsubscribe();
  }, [post?.id]);

  // ── Real-time Comments Count ──────────────────────
  useEffect(() => {
    if (!post?.id) return;

    const unsubscribe = listenToPostComments(post.id, (count) => {
      setCommentsCount(count);
    });

    return () => unsubscribe();
  }, [post?.id]);

  // ── Real-time Post Data ───────────────────────────
  useEffect(() => {
    if (!id) return;

    const postRef = doc(db, "posts", id);
    const unsubscribe = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPost({ id: docSnap.id, ...data } as Post);
      } else {
        setPost(null);
      }
    });

    return () => unsubscribe();
  }, [id]);

  // ── Load Post Owner ───────────────────────────────
  useEffect(() => {
    if (!post?.userId) return;

    const loadOwner = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("userId", "==", post.userId)
        );
        const userSnap = await getDocs(q);
        if (!userSnap.empty) {
          setOwner(userSnap.docs[0].data());
        }
      } catch (err) {
        console.error("Error loading owner", err);
      }
    };

    loadOwner();
  }, [post?.userId]);

  const handleSaveCaption = async () => {
    if (!post) return;
    try {
      showLoader();
      await editPostCaption(post.id, editedCaption.trim());
      setIsEditing(false);
    } finally {
      hideLoader();
    }
  };

  if (isLoading && !post) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4ADE80" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#9ca3af" }}>Post not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={{
              uri: owner?.image || `https://ui-avatars.com/api/?name=${owner?.fullname || "User"}&background=10b981&color=fff`,
            }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{owner?.username || "user"}</Text>
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={500}
          />
        </View>

        {/* Actions + Caption */}
        <View style={styles.details}>
          <View style={styles.actionsRow}>
            {/* Like */}
            <TouchableOpacity
              onPress={() =>
                toggleLikePost(
                  post.id,
                  (isLiked) => setLikedPosts({ [post.id]: isLiked }),
                  (count) => setLikesCount({ [post.id]: count })
                )
              }
              style={styles.actionBtn}
            >
              <Ionicons
                name={likedPosts[post.id] ? "heart" : "heart-outline"}
                size={28}
                color={likedPosts[post.id] ? "#ff3366" : "#fff"}
              />
            </TouchableOpacity>

            <Text style={styles.likesText}>
              {likesCount[post.id] ?? post.likes ?? 0} likes
            </Text>

            {/* Comment Button + Count */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                router.push({
                  pathname: "/(comments)/[postId]",
                  params: { postId: post.id },
                })
              }
            >
              <Ionicons
                name={commentsCount > 0 ? "chatbubble-ellipses" : "chatbubble-outline"}
                size={28}
                color={commentsCount > 0 ? "#40C4FF" : "#ddd"}
              />
            </TouchableOpacity>

            <Text style={[
              styles.likesText,
              commentsCount > 0 && { color: "#fff"}
            ]}>
              {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
            </Text>
          </View>

          {/* Caption */}
          <View style={styles.contentSection}>
            {isEditing ? (
              <>
                <TextInput
                  value={editedCaption}
                  onChangeText={(text) => {
                    setEditedCaption(text);
                    setCharCount(text.length);
                  }}
                  maxLength={2200}
                  multiline
                  autoFocus
                  style={styles.captionInput}
                  placeholder="Edit caption..."
                  placeholderTextColor="#6b7280"
                />
                <Text style={styles.charCount}>{charCount} / 2200</Text>

                <View style={styles.editActions}>
                  <TouchableOpacity onPress={() => setIsEditing(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveCaption}>
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View>
                <Text style={styles.caption}>
                  <Text style={{ fontWeight: "bold" }}>
                    {owner?.username || "user"}{" "}
                  </Text>

                  {expanded || !post.caption || post.caption.length <= CAPTION_LIMIT
                    ? post.caption
                    : post.caption.slice(0, CAPTION_LIMIT) + "..."}
                </Text>

                {post.caption && post.caption.length > CAPTION_LIMIT && (
                  <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                    <Text style={styles.readMoreText}>
                      {expanded ? "Read less" : "Read more"}
                    </Text>
                  </TouchableOpacity>
                )}

                {isOwner && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditedCaption(post.caption || "");
                      setCharCount(post.caption?.length || 0);
                      setIsEditing(true);
                    }}
                    style={styles.editButton}
                  >
                    <Text style={styles.editText}>Edit Caption</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "black" },
  header: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "#27272a" },
  username: { color: "white", fontWeight: "700", fontSize: 16 },
  imageContainer: { width: width, height: width * 0.95, backgroundColor: "#111", overflow: "hidden" },
  image: { flex: 1, width: "100%" },
  details: { paddingHorizontal: 16 },
  actionsRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 12, 
    gap: 20 
  },
  actionBtn: { padding: 4 },
  likesText: { color: "white", fontWeight: "700", fontSize: 15 },
  contentSection: { marginTop: 8 },
  caption: { color: "white", fontSize: 15, lineHeight: 22 },
  captionInput: {
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#4ADE80",
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: "#111",
  },
  readMoreText: { 
    color: "#9ca3af", 
    marginTop: 6, 
    fontWeight: "600", 
    fontSize: 14 
  },
  charCount: { color: "#6b7280", textAlign: "right", marginTop: 6, fontSize: 12 },
  editButton: { marginTop: 10, alignSelf: 'flex-start' },
  editText: { color: "#4ADE80", fontSize: 14, fontWeight: "500" },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 28, marginTop: 14 },
  saveText: { color: "#4ADE80", fontWeight: "bold", fontSize: 16 },
  cancelText: { color: "#9ca3af", fontSize: 16 },
});