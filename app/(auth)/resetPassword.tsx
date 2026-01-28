import { 
  View,
  Image,  
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Alert 
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useLoader } from "@/hooks/useLoader";
import { resetPassword } from "@/services/authService";

const ResetPassword = () => {
  const { showLoader, hideLoader, isLoading } = useLoader();
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Please enter your email");
      return;
    }

    try {
      showLoader();
      const response = await resetPassword(email);
      if (response.success) {
        Alert.alert(
          "Email Sent",
          "Check your inbox for the password reset link",
          [{ text: "OK", onPress: () => router.push("/login") }]
        );
      } else {
        Alert.alert("Error", response.message);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Try again later.");
    } finally {
      hideLoader();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, justifyContent: "center", padding: 20 }}
    >
        <View className="bg-zinc-950 p-6 rounded-2xl">
            {/* Logo & Header Section */}
            <View className="items-center mb-10">
                <Image
                    source={require("@/assets/images/hello-logo-rm-bg-green.png")}
                    style={{ width: 120, height: 120 }}
                    resizeMode="contain"
                />
            {/* Instruction text */}
            <Text className="text-zinc-400 mt-4 text-center text-base px-4">
                Enter your email below and we’ll send you a link to reset your password.
            </Text>  
        </View>      
        <Text className="text-white text-2xl font-bold mb-4 text-center">Reset Password</Text>
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#71717a"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          className="bg-white text-zinc-900 px-4 py-3 rounded-2xl border border-zinc-800 mb-4"
        />
        <TouchableOpacity
          onPress={handleResetPassword}
          disabled={isLoading}
          className="bg-green-600 py-4 rounded-2xl shadow-lg active:bg-green-700"
        >
          <Text className="text-white text-center font-bold text-lg">
            {isLoading ? "Sending..." : "Send Reset Email"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")} className="mt-4">
          <Text className="text-green-400 text-center">Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ResetPassword;
