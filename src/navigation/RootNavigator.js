import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "../screens/auth/Login";
import Dialler from "../screens/mains/Dialler";

const Stack = createStackNavigator();

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    setInitialRoute("Login");
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
