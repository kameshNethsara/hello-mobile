import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import { addPost } from "@/services/postsService";
import { uploadPostImage } from "@/services/cloudinaryService";

export default function CreateScreen() {
  const router = useRouter();

  const [caption, setCaption] = useState("");
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

  // -------- SHARE POST (CLOUDINARY) --------
  const handleShare = async () => {
    if (!selectedImage) return;

    try {
      setIsSharing(true);

      // Upload to Cloudinary using reusable function
      const imageUrl = await uploadPostImage(selectedImage);

      // Save to Firestore
      await addPost(imageUrl, caption);

      // Reset
      setSelectedImage(null);
      setCaption("");
      router.replace("/(tabs)");
    } catch (error) {
      console.log("Upload error:", error);
    } finally {
      setIsSharing(false);
    }
  };

  // -------- EMPTY STATE --------
  if (!selectedImage) {
    return (
      <View className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-800">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#4ADE80" />
          </TouchableOpacity>

          <Text className="text-white text-lg font-semibold">
            New Post
          </Text>

          <View className="w-7" />
        </View>

        <TouchableOpacity
          onPress={pickImage}
          className="flex-1 items-center justify-center gap-3"
        >
          <Ionicons name="image-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-400 text-base">
            Tap to select an image
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------- CREATE VIEW --------
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-black"
    >
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-800">
        <TouchableOpacity
          disabled={isSharing}
          onPress={() => {
            setSelectedImage(null);
            setCaption("");
          }}
        >
          <Ionicons
            name="close-outline"
            size={28}
            color={isSharing ? "#6B7280" : "#FFFFFF"}
          />
        </TouchableOpacity>

        <Text className="text-white text-lg font-semibold">
          New Post
        </Text>

        <TouchableOpacity disabled={isSharing} onPress={handleShare}>
          {isSharing ? (
            <ActivityIndicator size="small" color="#4ADE80" />
          ) : (
            <Text className="text-green-400 text-base font-semibold">
              Share
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View className="w-full aspect-square bg-neutral-900">
          <Image
            source={selectedImage}
            contentFit="cover"
            className="w-full h-full"
          />
        </View>

        <View className="px-4 py-3">
          <TextInput
            placeholder="Write a caption..."
            placeholderTextColor="#9CA3AF"
            value={caption}
            onChangeText={setCaption}
            multiline
            className="text-white text-base"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
