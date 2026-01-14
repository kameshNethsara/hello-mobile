import React from "react";
import { Slot } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LoaderProvider } from "@/context/LoaderContext";
import {AuthProvider } from "@/context/AuthContext";

const RootLayout = () => {
  return (
    <LoaderProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <SafeAreaView
            className="flex-1"
          >
            <Slot />
          </SafeAreaView>
        </SafeAreaProvider>
      </AuthProvider>
    </LoaderProvider>
   
  );
};

export default RootLayout;