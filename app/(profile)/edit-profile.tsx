import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image as RNImage,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { auth } from "@/services/firebase";
import {
  getCurrentUserDetails,
  addUserDetails,
  User,
  updateUserDetails,
} from "@/services/userService";
import { uploadUserAvatar } from "@/services/cloudinaryService";

export default function EditProfileScreen() {
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---------------- LOAD USER ----------------
  useEffect(() => {
    const loadUser = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        let userData = await getCurrentUserDetails();

        // AUTO CREATE USER DOC IF NOT EXISTS
        if (!userData) {
          await addUserDetails("", "", currentUser.email || "", "", "");
          userData = await getCurrentUserDetails();
        }

        if (userData) {
          setUser(userData);
          setUsername(userData.username || "");
          setFullname(userData.fullname || "");
          setBio(userData.bio || "");
          setAvatarUri(userData.image || null);
        }
      } catch (error) {
        console.error("Load user error:", error);
        Alert.alert("Error", "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [currentUser]);

  // ---------------- PICK IMAGE ----------------
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // ---------------- SAVE ----------------
  const handleSave = async () => {
    if (!user) return;

    if (!username.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = user.image;

      if (avatarUri && avatarUri !== user.image) {
        imageUrl = await uploadUserAvatar(avatarUri);
      }

      const updates = {
        username: username.trim(),
        fullname: fullname.trim(),
        bio: bio.trim(),
        image: imageUrl || "",
      };

      await updateUserDetails(user.id, updates);

      Alert.alert("Success", "Profile updated");
      router.back();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- UI STATES ----------------
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Profile not found (Firestore)</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <Text style={styles.doneText}>Done</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* AVATAR */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <RNImage
              source={{
                uri:
                  avatarUri ||
                  user.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    fullname || username || "User"
                  )}&background=10b981&color=fff`,
              }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
              <Ionicons name="camera" size={18} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        {/* FORM */}
        <View style={styles.form}>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
          <TextInput
            value={fullname}
            onChangeText={setFullname}
            placeholder="Full name"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Bio"
            placeholderTextColor="#6b7280"
            multiline
            style={[styles.input, styles.bioInput]}
          />
        </View>

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
  scrollContainer: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  notFoundText: {
    color: "white",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  doneText: {
    color: "#10b981",
    fontSize: 16,
    fontWeight: "600",
  },
  avatarContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#10b981",
    padding: 10,
    borderRadius: 30,
  },
  form: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#1f1f1f",
    color: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
});
