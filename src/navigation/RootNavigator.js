import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "../screens/auth/Login";
import Dialler from "../screens/mains/Dialler";
import { useAuthStore } from "../store/authStore";
import { loadSession } from "../utils/secureStorage";

const Stack = createStackNavigator();

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setSipCredentials = useAuthStore((s) => s.setSipCredentials);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session?.tokens && session?.sipCredentials) {
        setTokens(session.tokens);
        setSipCredentials(session.sipCredentials);
        setInitialRoute("Dialler");
      } else {
        setInitialRoute("Login");
      }
    })();
  }, []);

  if (!initialRoute) return <View style={{ flex: 1, backgroundColor: "#fff" }} />;

  return (
    <Stack.Navigator initialRouteName={initialRoute}>
      <Stack.Screen
        name="Login"
        component={Login}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Dialler"
        component={Dialler}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
