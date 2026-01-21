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
} from "firebase/firestore";
import { db, auth } from "@/services/firebase";
import { useLoader } from "@/hooks/useLoader";
import { editPostCaption } from "@/services/postsService";

const { width } = Dimensions.get("window");

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);

  const isOwner = auth.currentUser?.uid === post?.userId;

  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");
  const [charCount, setCharCount] = useState(0);

  const { showLoader, hideLoader, isLoading } = useLoader();

  useEffect(() => {
    if (!id) return;

    const loadPost = async () => {
      try {
        showLoader();
        const postRef = doc(db, "posts", id);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) return;

        const postData = postSnap.data();
        setPost({ id: postSnap.id, ...postData });

        const q = query(
          collection(db, "users"),
          where("userId", "==", postData.userId)
        );

        const userSnap = await getDocs(q);
        if (!userSnap.empty) {
          setOwner(userSnap.docs[0].data());
        }
      } finally {
        hideLoader();
      }
    };

    loadPost();
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
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

  const handleSaveCaption = async () => {
    if (!post) return;
    try {
      showLoader();
      await editPostCaption(post.id, editedCaption.trim());
      setPost((prev: any) => ({
        ...prev,
        caption: editedCaption.trim(),
      }));
      setIsEditing(false);
    } finally {
      hideLoader();
    }
  };

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
              uri: owner?.image || `https://ui-avatars.com/api/?name=${owner?.fullname || "User"}`,
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
          <View style={styles.metaRow}>
            <Text style={styles.meta}>❤️ {post.likes}</Text>
            <Text style={styles.meta}>💬 {post.comments}</Text>
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
                  <Text style={{ fontWeight: "bold" }}>{owner?.username || "user"} </Text>
                  {post.caption || "No caption"}
                </Text>

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
        
        {/* Extra space at bottom to ensure scrolling feels natural */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  scrollContent: {
    flexGrow: 1, 
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  username: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  imageContainer: {
    width: width,
    height: width * 0.95,
    backgroundColor: "#111",
    overflow: "hidden",
  },
  image: {
    flex: 1,
    width: "100%",
  },
  details: {
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: "row",
    gap: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#27272a",
  },
  meta: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  contentSection: {
    marginTop: 12,
  },
  caption: {
    color: "white",
    fontSize: 15,
    lineHeight: 22,
  },
  captionInput: {
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: "#111",
  },
  charCount: {
    color: "#6b7280",
    textAlign: "right",
    marginTop: 6,
    fontSize: 12,
  },
  editButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "500",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    marginTop: 12,
  },
  saveText: {
    color: "#10b981",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelText: {
    color: "#9ca3af",
    fontSize: 16,
  },
});