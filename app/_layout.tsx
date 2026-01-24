import React, { useEffect } from "react";
import { Slot, useRouter } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LoaderProvider } from "@/context/LoaderContext";
import { AuthProvider } from "@/context/AuthContext";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase";

const RootLayout = () => {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/(auth)/login");
      } else {
        router.replace("/(tabs)");
      }
    });

    return unsub;
  }, []);

  return (
    <LoaderProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1 }}>
            <Slot />
          </SafeAreaView>
        </SafeAreaProvider>
      </AuthProvider>
    </LoaderProvider>
    
  );
};

export default RootLayout;
