import { useEffect, useRef, useState } from "react";
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
  Animated,
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
import { useLoader } from "@/hooks/useLoader";

export default function EditProfileScreen() {
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [bio, setBio] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const { showLoader, hideLoader, isLoading } = useLoader();
  const [saving, setSaving] = useState(false);

  // --- ANIMATION VALUES ---
  const usernameAnim = useRef(new Animated.Value(0)).current;
  const fullnameAnim = useRef(new Animated.Value(0)).current;
  const bioAnim = useRef(new Animated.Value(0)).current;

  const animateLabel = (animValue: Animated.Value, toValue: number) => {
    Animated.timing(animValue, {
      toValue,
      duration: 200,
      useNativeDriver: false, // top/left/fontSize don't support native driver
    }).start();
  };

  // ---------------- LOAD USER ----------------
  useEffect(() => {
    const loadUser = async () => {
      if (!currentUser) return;
      try {
        showLoader();
        let userData = await getCurrentUserDetails();

        if (!userData) {
          await addUserDetails("", "", currentUser.email || "", "", "");
          userData = await getCurrentUserDetails();
        }

        if (userData) {
          setUser(userData);
          setUsername(userData.username || "");
          setFullname(userData.fullname || "");
          setBio(userData.bio || "");
          setCharCount(userData.bio?.length || 0);
          setAvatarUri(userData.image || null);
          
          // Trigger animations if values exist
          if (userData.username) animateLabel(usernameAnim, 1);
          if (userData.fullname) animateLabel(fullnameAnim, 1);
          if (userData.bio) animateLabel(bioAnim, 1);
        }
      } catch (error) {
        console.error("Load user error:", error);
        Alert.alert("Error", "Failed to load profile");
      } finally {
        hideLoader();
      }
    };
    loadUser();
  }, [currentUser]);

  // --- HELPER FOR ANIMATED STYLES ---
  const getFloatingLabelStyle = (anim: Animated.Value) => ({
    top: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [14, -10], // Moves label from inside to top
    }),
    fontSize: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 12],
    }),
    color: anim.interpolate({
      inputRange: [0, 1],
      outputRange: ["#6b7280", "#4ADE80"],
    }),
  });

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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
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
                  user?.image ||
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
          {/* USERNAME */}
          <View style={styles.inputWrapper}>
            <Animated.Text style={[styles.label, getFloatingLabelStyle(usernameAnim)]}>
              Username
            </Animated.Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              onFocus={() => animateLabel(usernameAnim, 1)}
              onBlur={() => !username && animateLabel(usernameAnim, 0)}
              style={styles.input}
              placeholderTextColor="transparent" // Placeholder hidden to use animated label
            />
          </View>

          {/* FULLNAME */}
          <View style={styles.inputWrapper}>
            <Animated.Text style={[styles.label, getFloatingLabelStyle(fullnameAnim)]}>
              Full Name
            </Animated.Text>
            <TextInput
              value={fullname}
              onChangeText={setFullname}
              onFocus={() => animateLabel(fullnameAnim, 1)}
              onBlur={() => !fullname && animateLabel(fullnameAnim, 0)}
              style={styles.input}
              placeholderTextColor="transparent"
            />
          </View>

          {/* BIO */}
          <View style={styles.inputWrapper}>
            <Animated.Text style={[styles.label, getFloatingLabelStyle(bioAnim)]}>
              Bio
            </Animated.Text>
            <TextInput
              value={bio}
              onChangeText={(text) => {
                setBio(text);
                setCharCount(text.length);
              }}
              onFocus={() => animateLabel(bioAnim, 1)}
              onBlur={() => !bio && animateLabel(bioAnim, 0)}
              maxLength={200}
              multiline
              style={[styles.input, styles.bioInput]}
              placeholderTextColor="transparent"
            />
          </View>
          <Text style={styles.charCount}>{charCount} / 200</Text>
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
    color: "#4ADE80",
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
    backgroundColor: "#4ADE80",
    padding: 10,
    borderRadius: 30,
  },
  form: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  inputWrapper: {
    position: "relative",
    marginBottom: 20,
  },
  label: {
    position: "absolute",
    left: 12,
    // backgroundColor: "white", // Masks the input border behind the label
    paddingHorizontal: 4,
    zIndex: 1,
  },
  input: {
    backgroundColor: "#1f1f1f",
    color: "white",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    color: "#9ca3af",
    textAlign: "right",
    marginTop: -10,
    marginBottom: 10,
    fontSize: 14,
  },
});