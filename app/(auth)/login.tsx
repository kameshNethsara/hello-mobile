import { 
  Image, 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import React, { useState } from 'react';
import { useRouter } from "expo-router";
// Corrected navigate import to use router.replace or router.push per Expo Router best practices
import { useLoader } from '@/hooks/useLoader';
import { loging } from '@/services/authService';

const login = () => {
  const { showLoader, hideLoader, isLoading } = useLoader();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (isLoading) return;
    
    if (!email || !password) {
      Alert.alert("Please fill all the fields");
      return;
    }
    
    try {
      showLoader();
      await loging(email, password);
      // Using router.replace for navigation after login is generally better 
      // to prevent users from going back to the login screen
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Error Login user");
    } finally {
      hideLoader();
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1 }}
      className="bg-zinc-950"
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-8 py-10">
          
          {/* Logo & Header Section */}
          <View className="items-center mb-10">
            <Image
              source={require("@/assets/images/hello-logo-rm-bg-green.png")}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
            />
            
            <Text className="text-4xl font-extrabold text-white tracking-tight mt-4">
              Welcome Back
            </Text>
            <Text className="text-zinc-400 mt-2 text-lg">
              Sign in to your account
            </Text>
          </View>

          {/* Input Fields */}
          <View className="space-y-4">
            <View>
              <Text className="text-zinc-300 mb-2 ml-1 font-medium">Email Address</Text>
              <TextInput
                placeholder="email@example.com"
                placeholderTextColor="#71717a"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-zinc-900 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-green-500"
              />
            </View>

            <View className="mt-4">
              <Text className="text-zinc-300 mb-2 ml-1 font-medium">Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#71717a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                className="bg-zinc-900 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-green-500"
              />
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            className="mt-4 items-end"
            onPress={() => router.push("/resetPassword")}
          >
            <Text className="text-green-400 font-medium">Forgot Password?</Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View className="mt-10">
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              className="bg-green-600 py-4 rounded-2xl shadow-lg active:bg-green-700"
            >
              <Text className="text-white text-center font-bold text-lg">
                {isLoading ? "Logging in..." : "Login"}
              </Text>
            </TouchableOpacity>

            <View className="flex-row justify-center items-center mt-5">
              <Text className="text-zinc-500">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text className="text-green-400 font-bold">Register</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default login;