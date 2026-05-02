import * as SecureStore from "expo-secure-store";

const SESSION_KEY = process.env.EXPO_PUBLIC_SESSION_KEY;

export const saveSession = async (tokens, sipCredentials) => {
  await SecureStore.setItemAsync(
    SESSION_KEY,
    JSON.stringify({ tokens, sipCredentials }),
  );
};

export const loadSession = async () => {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearSession = async () => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};
