// context/LoaderContext.tsx
import React, { createContext, useState, ReactNode } from "react";
import { View, ActivityIndicator, Image, Text } from "react-native";

interface LoaderContextProps {
  showLoader: () => void;
  hideLoader: () => void;
  isLoading: boolean;
}

export const LoaderContext = createContext<LoaderContextProps>({
  showLoader: () => {},
  hideLoader: () => {},
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
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        >
          <View
            style={{
              backgroundColor: "#111827",
              padding: 24,
              borderRadius: 24,
              alignItems: "center",
              width: 220,
            }}
          >
            {/* LOGO */}
            <Image
              source={require("@/assets/images/hello-logo-rm-bg-green.png")}
              style={{
                width: 80,
                height: 80,
                marginBottom: 5,
              }}
              resizeMode="contain"
            />
            
            <Text className="text-4xl font-extrabold text-white tracking-tight mb-4">
              Hello
            </Text>

            {/* LOADING SPINNER */}
            <ActivityIndicator size="large" color="#10b981" />

            {/* OPTIONAL TEXT */}
            <Text
              style={{
                color: "#9ca3af",
                marginTop: 12,
                fontSize: 14,
              }}
            >
              Please wait...
            </Text>
          </View>
        </View>
      )}
    </LoaderContext.Provider>
  );
};
