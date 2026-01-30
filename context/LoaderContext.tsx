// context/LoaderContext.tsx
import { BlurView } from "expo-blur";
import React, { createContext, ReactNode, useState } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";

interface LoaderContextProps {
  showLoader: () => void;
  hideLoader: () => void;
  isLoading: boolean;
}

export const LoaderContext = createContext<LoaderContextProps>({
  showLoader: () => { },
  hideLoader: () => { },
  isLoading: false,
});

export const LoaderProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, isLoading }}>
      {children}

      {isLoading && (
        <BlurView
          intensity={80}
          tint="dark"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(17, 24, 39, 0.8)", // Semi-transparent dark bg
              padding: 30,
              borderRadius: 24,
              alignItems: "center",
              width: 240,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* LOGO WITH PULSE ANIMATION */}
            <PulseLogo />

            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: "white",
                letterSpacing: -0.5,
                marginBottom: 16
              }}
            >
              Hello
            </Text>

            {/* LOADING SPINNER */}
            <ActivityIndicator size="large" color="#4ADE80" />

            {/* OPTIONAL TEXT */}
            <Text
              style={{
                color: "#9ca3af",
                marginTop: 12,
                fontSize: 14,
                fontWeight: "500",
              }}
            >
              Please wait...
            </Text>
          </View>
        </BlurView>
      )}
    </LoaderContext.Provider>
  );
};

// Helper component for pulsing logo
const PulseLogo = () => {
  const [scale] = useState(new Animated.Value(1));

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.Image
      source={require("@/assets/images/hello-logo-rm-bg-green.png")}
      style={{
        width: 80,
        height: 80,
        marginBottom: 10,
        transform: [{ scale }],
      }}
      resizeMode="contain"
    />
  );
};
