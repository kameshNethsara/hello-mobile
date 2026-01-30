import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS } from "@/constants/theme";
import { uploadPostImage } from "@/services/cloudinaryService";
import { addPost } from "@/services/postsService";
import { incrementUserPosts } from "@/services/userService";

export default function CreateScreen() {
  const router = useRouter();

  const [caption, setCaption] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // -------- PICK IMAGE --------
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // -------- TAKE PHOTO --------
  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Error taking photo:", error);
      alert("Error accessing camera");
    }
  };

  // -------- SHARE POST --------
  const handleShare = async () => {
    if (!selectedImage) return;

    try {
      setIsSharing(true);
      // Upload to Cloudinary
      const imageUrl = await uploadPostImage(selectedImage);
      // Save to Firestore
      await addPost(imageUrl, caption);

      //Increment user's post count
      await incrementUserPosts();

      // Reset and Navigate
      setSelectedImage(null);
      setCaption("");
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to share post. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  // -------- 1. EMPTY STATE (No Image Selected) --------
  if (!selectedImage) {
    return (
      <View style={styles.container}>
        {/* Simple Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-800">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#4ADE80" />
          </TouchableOpacity>
          {/* <Text className="text-white text-lg font-semibold">New Post</Text> */}
          <Text style={styles.title}>New Post</Text>
          <View className="w-7" />
        </View>

        {/* Center Picker Actions */}
        <View className="flex-1 items-center justify-center gap-8">

          {/* Gallery Option */}
          <TouchableOpacity
            onPress={pickImage}
            className="items-center justify-center gap-3"
          >
            <View className="bg-neutral-900 p-6 rounded-full w-24 h-24 items-center justify-center border border-neutral-800">
              <Ionicons name="images-outline" size={40} color="#4ADE80" />
            </View>
            <Text className="text-gray-400 text-base font-medium">
              Pick from Gallery
            </Text>
          </TouchableOpacity>

          <Text className="text-neutral-600 font-bold">OR</Text>

          {/* Camera Option */}
          <TouchableOpacity
            onPress={takePhoto}
            className="items-center justify-center gap-3"
          >
            <View className="bg-neutral-900 p-6 rounded-full w-24 h-24 items-center justify-center border border-neutral-800">
              <Ionicons name="camera-outline" size={40} color="#40C4FF" />
            </View>
            <Text className="text-gray-400 text-base font-medium">
              Take a Photo
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    );
  }

  // -------- 2. CREATE VIEW (Image Selected) --------
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "black" }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-800">
        <TouchableOpacity
          disabled={isSharing}
          onPress={() => {
            setSelectedImage(null);
            setCaption("");
            setCharCount(0);
          }}
        >
          <Ionicons
            name="close-outline"
            size={32}
            color={isSharing ? "#4b5563" : "#FFFFFF"}
          />
        </TouchableOpacity>

        <Text className="text-white text-lg font-semibold">New Post</Text>

        <TouchableOpacity disabled={isSharing || !selectedImage} onPress={handleShare}>
          {isSharing ? (
            <ActivityIndicator size="small" color="#4ADE80" />
          ) : (
            <Text className="text-green-400 text-base font-bold">Share</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Preview */}
        <View className="w-full aspect-square bg-neutral-900">
          <Image
            source={{ uri: selectedImage }}
            contentFit="cover"
            className="w-full h-full"
          />
        </View>

        {/* Input Section */}
        <View className="px-4 py-4">
          <TextInput
            placeholder="Write a caption..."
            placeholderTextColor="#6b7280"
            value={caption}
            onChangeText={(text) => {
              setCaption(text);
              setCharCount(text.length);
            }}
            maxLength={2200}
            multiline
            style={styles.captionInput}
          />
          <Text style={styles.charCount}>{charCount} / 2200</Text>
        </View>

        {/* Space for keyboard buffer */}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Loading Overlay */}
      {isSharing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4ADE80" />
          <Text style={styles.loadingText}>Sharing Post...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingText: {
    color: "white",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  captionInput: {
    color: "white",
    fontSize: 16,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: "#4ADE80",
    borderRadius: 12,
    padding: 15,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: "#0a0a0a",
  },
  charCount: {
    color: "#4b5563",
    textAlign: "right",
    marginTop: 8,
    fontSize: 12,
  },
});