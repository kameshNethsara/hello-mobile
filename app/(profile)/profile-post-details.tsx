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
import { useLocalSearchParams } from "expo-router";
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
  Post, 
  toggleLikePost 
} from "@/services/postsService";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);

  const isOwner = auth.currentUser?.uid === post?.userId;

  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");
  const [charCount, setCharCount] = useState(0);

  const CAPTION_LIMIT = 250;
  const [expanded, setExpanded] = useState(false);

  const { showLoader, hideLoader, isLoading } = useLoader();

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);

  // ── Handle Toggle Like ─────────────────────────────
  const handleToggleLike = async () => {
    if (!post) return;
    try {
      // The service uses runTransaction, so the UI will update via the onSnapshot listener
      await toggleLikePost(post.id, setLiked, setLikesCount);
    } catch (err) {
      console.error("Failed to toggle like", err);
    }
  };

  // ── Real-time Post Data Listener ───────────────────
  useEffect(() => {
    if (!id) return;

    // Listen to the specific post for real-time likes and caption updates
    const postRef = doc(db, "posts", id);
    const unsubscribe = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPost({ id: docSnap.id, ...data });
        setLikesCount(data.likes || 0);
      }
    });

    return () => unsubscribe();
  }, [id]);

  // ── Check if current user liked the post ───────────
  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const likeRef = doc(db, "posts", id, "likes", auth.currentUser.uid);
    const unsubscribe = onSnapshot(likeRef, (docSnap) => {
      setLiked(docSnap.exists());
    });

    return () => unsubscribe();
  }, [id]);

  // ── Load Post Owner Data ───────────────────────────
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

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleToggleLike} style={styles.actionBtn}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={26}
                color={liked ? "red" : "#fff"}
              />
            </TouchableOpacity>

            <Text style={styles.likesText}>{likesCount} likes</Text>

            <TouchableOpacity onPress={() => console.log("Go to comments")} style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

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

                  {expanded || post.caption?.length <= CAPTION_LIMIT
                    ? post.caption?.replace(/\n/g, " ")
                    : post.caption?.slice(0, CAPTION_LIMIT).replace(/\n/g, " ") + "..."}
                </Text>

                {post.caption?.length > CAPTION_LIMIT && (
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
        
        <View style={{ height: 40 }} />
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
  actionsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 16 },
  actionBtn: { padding: 4 },
  likesText: { color: "white", fontWeight: "700", fontSize: 15 },
  contentSection: { marginTop: 12 },
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
  readMoreText: { color: "#9ca3af", marginTop: 4, fontWeight: "bold", textDecorationLine: "underline", fontSize: 14 },
  charCount: { color: "#6b7280", textAlign: "right", marginTop: 6, fontSize: 12 },
  editButton: { marginTop: 8, alignSelf: 'flex-start' },
  editText: { color: "#4ADE80", fontSize: 14, fontWeight: "500" },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 24, marginTop: 12 },
  saveText: { color: "#4ADE80", fontWeight: "bold", fontSize: 16 },
  cancelText: { color: "#9ca3af", fontSize: 16 },
});