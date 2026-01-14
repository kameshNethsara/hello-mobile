import {
  View,
  Image,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { registerUser } from "@/services/authService";
import { useLoader } from "@/hooks/useLoader";

const Register = () => {
  const router = useRouter();

  const { showLoader, hideLoader, isLoading } = useLoader()

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handelRegister = async () => {
    if (isLoading) return
    
    if (!name || !email || !password || !confirmPassword) {
      console.log("Please fill all the fields");
      Alert.alert("Please fill all the fields")
      return;
    }
    if (password !== confirmPassword) {
      console.log("Passwords do not match");
      Alert.alert("Passwords do not match")
      return;
    }
    
    try {
      showLoader()
      await registerUser(name, email, password);
      console.log("User registered successfully");
      Alert.alert("User registered successfully")
      router.push("/login");
    } catch (error) {
      console.log("Error registering user:", error);
      Alert.alert("Error registering user")
    } finally {
      hideLoader()
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-zinc-950"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8 py-12">
          {/* Logo */}
          <View className="items-center mb-6">
            <Image
              source={require("@/assets/images/hello-logo-rm-bg-green.png")}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
            />
            {/* Header Section */}
            <Text className="text-4xl font-extrabold text-white tracking-tight">
              Create Account
            </Text>
            <Text className="text-zinc-400 mt-2 text-lg">
              Join us and start your journey
            </Text>
          </View>

          {/* Input Fields */}
          <View className="space-y-4">
            {/* Full Name */}
            <View>
              <Text className="text-zinc-300 mb-2 ml-1 font-medium">
                Full Name
              </Text>
              <TextInput
                placeholder="name"
                placeholderTextColor="#71717a"
                value={name}
                onChangeText={setName}
                className="bg-zinc-900 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-blue-500"
              />
            </View>

            {/* Email Address */}
            <View>
              <Text className="text-zinc-300 mb-2 ml-1 font-medium">
                Email Address
              </Text>
              <TextInput
                placeholder="email@example.com"
                placeholderTextColor="#71717a"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-zinc-900 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-blue-500"
              />
            </View>

            {/* Password */}
            <View>
              <Text className="text-zinc-300 mb-2 ml-1 font-medium">
                Password
              </Text>
              <TextInput
                placeholder="Minimum 8 characters"
                placeholderTextColor="#71717a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                className="bg-zinc-900 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-blue-500"
              />
            </View>

            <View>
              <Text className="text-zinc-300 mb-2 ml-1 font-medium">
                Conformed Password
              </Text>
              <TextInput
                placeholder="Minimum 8 characters"
                placeholderTextColor="#71717a"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                className="bg-zinc-900 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-blue-500"
              />
            </View>
          </View>

          {/* Terms text */}
          <Text className="text-zinc-500 text-xs mt-4 px-1">
            By signing up, you agree to our{" "}
            <Text className="text-green-400">Terms of Service</Text> and{" "}
            <Text className="text-green-400">Privacy Policy</Text>.
          </Text>

          {/* Action Buttons */}
          <View className="mt-10 space-y-4">
            <TouchableOpacity
              onPress={handelRegister}
              className="bg-green-600 py-4 rounded-2xl shadow-lg active:bg-green-700"
            >
              <Text className="text-white text-center font-bold text-lg">
                Register
              </Text>
            </TouchableOpacity>

            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-zinc-500">Already have an account? </Text>
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack?.()) {
                    router.back();
                  } else {
                    router.push("/login");
                  }
                }}
              >
                <Text className="text-green-400 font-bold">Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Register;