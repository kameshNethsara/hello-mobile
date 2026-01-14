import { View, Image, Text, ScrollView, TouchableOpacity } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';

export default function GetStart() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-black px-8" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      
      {/* Logo */}
      <View className="items-center mb-6">
        <Image
          source={require("@/assets/images/hello-logo-rm-bg-green.png")}
          style={{ width: 120, height: 120 }}
          resizeMode="contain"
        />
        <Text className="text-4xl font-extrabold text-white tracking-tight">
          Hello
        </Text>
        <Text className="text-zinc-400 mt-2 text-lg">
          Don't miss anything
        </Text>
      </View>

      {/* Illustration */}
      <View className="items-center mb-6">
        <Image
          source={require("@/assets/images/auth-bg-1.png")}
          style={{ width: 400, height: 400 }}
          resizeMode="cover"
        />
      </View>

      {/* Action Buttons */}
      <View className="mt-10 space-y-4">
        <TouchableOpacity
          onPress={() => router.push("/login")}
          className="bg-green-600 py-4 rounded-2xl shadow-lg active:bg-green-700"
        >
          <Text className="text-white text-center font-bold text-lg">Get Started</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}
