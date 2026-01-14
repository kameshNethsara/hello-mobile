import { Image, View, Text, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import { router, useRouter } from 'expo-router'
import { navigate } from 'expo-router/build/global-state/routing';
// import { useGoogleAuth } from "@/service/useGoogleAuth";
import { useLoader } from '@/hooks/useLoader';
import { loging } from '@/services/authService';

const login = () => {
  
  // const { signIn } = useGoogleAuth();
  const { showLoader, hideLoader, isLoading } = useLoader()
  
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    // Add your login logic here
    // console.log("Logging in with:", email, password);
    // navigate("/home");
     if (isLoading) return
    
    if (!email || !password) {
      console.log("Please fill all the fields");
      Alert.alert("Please fill all the fields")
      return;
    }
    try {
      showLoader()
      await loging(email, password);
      navigate("/(tabs)");
    } catch (error) {
      Alert.alert("Error Login user")
    } finally {
      hideLoader()
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      className="flex-1 bg-zinc-950"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-8">

           {/* Logo */}
          <View className="items-center mb-6">
            <Image
              source={require("@/assets/images/hello-logo-rm-bg-green.png")}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
            />

            {/* Header Section */}
            
            <Text className="text-4xl font-extrabold text-white tracking-tight">
              Welcome Back
            </Text>
            <Text className="text-zinc-400 mt-2 text-lg">
              Sign in to your account
            </Text>
          </View>

          {/* Illustration */}
          {/* <View className="items-center mb-6">
            <Image
              source={require("@/assets/images/auth-bg-1.png")}
              style={{ width: 200, height: 200 }}
              resizeMode="cover"
            />
          </View> */}
          
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
                className="bg-zinc-900 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-blue-500"
              />
            </View>

            <View>
              <Text className="text-zinc-300 mb-2 ml-1 font-medium">Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#71717a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                className="bg-zinc-900 text-white px-5 py-4 rounded-2xl border border-zinc-800 focus:border-blue-500"
              />
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity className="mt-4 items-end">
            <Text className="text-green-400 font-medium">Forgot Password?</Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View className="mt-10 space-y-4">
            <TouchableOpacity
              onPress={handleLogin}
              className="bg-green-600 py-4 rounded-2xl shadow-lg active:bg-green-700"
            >
              <Text className="text-white text-center font-bold text-lg">Login</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              onPress={signIn}
              className="bg-blue-600 py-4 rounded-2xl shadow-lg active:bg-blue-700"
            >
              <Text className="text-white text-center font-bold text-lg">Login with Google</Text>
            </TouchableOpacity> */}

            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-zinc-500">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text className="text-green-400 font-bold">Register</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export default login