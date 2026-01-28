import { COLORS } from "@/constants/theme";
import {
  addComment,
  Comment,
  deleteComment,
  listenToComments,
} from "@/services/commentsService";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const auth = getAuth();

export default function CommentsScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const COMMENT_PREVIEW_LENGTH = 120;
  const flatListRef = useRef<FlatList>(null);

  // ─── Real-time comments listener ────────────────────────────────
  useEffect(() => {
    if (!postId) return;

    const unsubscribe = listenToComments(postId, (newComments) => {
      setComments(newComments);

      // Auto-scroll to bottom when new comments arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    });

    return () => unsubscribe();
  }, [postId]);

  // ─── Send comment ────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || sending || !postId) return;

    setSending(true);
    try {
      await addComment(postId, text.trim());
      setText("");

      // Scroll after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (err) {
      Alert.alert("Error", "Could not post comment. Try again.");
    } finally {
      setSending(false);
    }
  };

  // ─── Toggle expanded ────────────────────────────────
  const toggleExpanded = (commentId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  // ─── Delete comment ────────────────────────────────
  const handleDelete = (commentId: string) => {
    Alert.alert("Delete Comment", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteComment(postId!, commentId);
          } catch (err) {
            Alert.alert("Error", "Could not delete comment.");
          }
        },
      },
    ]);
  };

  // ─── Format timestamp ────────────────────────────────
  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "just now";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : timestamp;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  // ─── Render single comment ────────────────────────────────
  const renderComment = ({ item }: { item: Comment }) => {
    const isOwnComment = item.userId === auth.currentUser?.uid;
    const isExpanded = expandedComments[item.id] ?? false;

    const displayedText = isExpanded
      ? item.content
      : item.content.length > COMMENT_PREVIEW_LENGTH
        ? item.content.slice(0, COMMENT_PREVIEW_LENGTH) + "…"
        : item.content;

    return (
      <View
        style={[
          styles.commentBubble,
          isOwnComment ? styles.myComment : styles.otherComment,
        ]}
      >
        <View style={styles.commentHeader}>
          <Text style={styles.username}>
            {isOwnComment ? "You" : item.username || "User"}
          </Text>
          <Text style={styles.timestamp}>{getTimeAgo(item.createdAt)}</Text>
        </View>

        <View style={styles.commentContent}>
          <Text style={styles.commentText}>{displayedText}</Text>

          {item.content.length > COMMENT_PREVIEW_LENGTH && (
            <TouchableOpacity
              onPress={() => toggleExpanded(item.id)}
              activeOpacity={0.7}
              style={{ alignSelf: "flex-start" }}
            >
              <Text style={styles.readMoreText}>
                {isExpanded ? "Read less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}

          {isOwnComment && (
            <View style={styles.commentActions}>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="trash-outline" size={18} color="#ff6666" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─── Empty state ────────────────────────────────
  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-outline" size={48} color={COLORS.grey} />
      <Text style={styles.emptyText}>No comments yet</Text>
      <Text style={styles.emptySubText}>Be the first to comment!</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Ionicons name="arrow-back" size={26} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Comments</Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Comments list */}
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
        />

        {/* Input area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={COLORS.grey}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!text.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons
                name="send"
                size={22}
                color={text.trim() ? COLORS.primary : COLORS.grey}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // space for input
    flexGrow: 1,
  },
  commentBubble: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    maxWidth: "82%",
  },
  myComment: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary + "30",
    borderBottomRightRadius: 4,
  },
  otherComment: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  username: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.white,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.grey,
  },
  commentContent: {
    flexDirection: "column",
    gap: 6,
  },
  commentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  commentText: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 20,
  },
  readMoreText: {
    marginTop: 4,
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.white,
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.grey,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});