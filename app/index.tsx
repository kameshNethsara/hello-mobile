import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import "../global.css";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }
  if (user) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href={"/login"} />;
  }
};

export default Index;
