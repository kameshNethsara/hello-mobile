import { View, Text } from "react-native";
import React from "react";
import { Stack } from "expo-router";

const AuthLayout = () => {
  return (
    <Stack
    screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: "#09090B",
        },
      }}>
      <Stack.Screen
        name="register"
        options={{
          title: "Register",
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: "Hi - Login",
          headerShown: false,
          animation: "slide_from_left",
        }}
      />
    </Stack>
  );
};

export default AuthLayout;
