import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { useAuthStore } from "../../store/authStore";
import { clearSession } from "../../utils/secureStorage";
import sipService from "../../services/sipService";

const SIP_STATUS = {
  REGISTERING: "registering",
  REGISTERED: "registered",
  FAILED: "failed",
};

const StatusPill = ({ status }) => {
  const isRegistering = status === SIP_STATUS.REGISTERING;
  const isRegistered = status === SIP_STATUS.REGISTERED;

  return (
    <View style={styles.statusPill}>
      {isRegistering ? (
        <ActivityIndicator size="small" color="#000" style={styles.statusIndicator} />
      ) : (
        <View style={[styles.statusDot, isRegistered ? styles.dotOnline : styles.dotOffline]} />
      )}
      <Text style={[styles.statusText, isRegistered && styles.statusTextOnline]}>
        {isRegistering ? "Registering" : isRegistered ? "Registered" : "Offline"}
      </Text>
    </View>
  );
};

const Dialler = ({ navigation }) => {
  const [sipStatus, setSipStatus] = useState(SIP_STATUS.REGISTERING);
  const [permissionStatus, setPermissionStatus] = useState(null);

  const sipCredentials = useAuthStore((s) => s.sipCredentials);

  const clearAuth = useAuthStore((s) => s.clear);

  useEffect(() => {
    requestMicPermission();
  }, []);

  useEffect(() => {
    if (!sipCredentials) return;

    sipService.init(sipCredentials, {
      onRegistered: () => setSipStatus(SIP_STATUS.REGISTERED),
      onRegistrationFailed: () => setSipStatus(SIP_STATUS.FAILED),
      onNewRTCSession: handleNewRTCSession,
    });

    return () => sipService.stop();
  }, [sipCredentials]);

  const handleNewRTCSession = (e) => {
    // TODO: handle incoming / outgoing calls
  };

  const requestMicPermission = async () => {
    const { granted, canAskAgain } = await requestRecordingPermissionsAsync();
    setPermissionStatus({ granted, canAskAgain });
  };

  const handleLogout = async () => {
    sipService.stop();
    await clearSession();
    clearAuth();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar: status centered, logout top-right */}
      <View style={styles.topBar}>
        <View style={styles.topBarSide} />
        <StatusPill status={sipStatus} />
        <View style={styles.topBarSide}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.container}>
        {permissionStatus && !permissionStatus.granted && (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionTitle}>Microphone access required</Text>
            <Text style={styles.permissionBody}>
              Please enable microphone access in your device settings to make calls.
            </Text>
            {permissionStatus.canAskAgain && (
              <TouchableOpacity style={styles.retryBtn} onPress={requestMicPermission}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topBarSide: {
    flex: 1,
    alignItems: "flex-end",
  },

  // Status pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  statusIndicator: {
    width: 14,
    height: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: "#22c55e",
  },
  dotOffline: {
    backgroundColor: "#aaa",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    letterSpacing: 0.2,
  },
  statusTextOnline: {
    color: "#000",
  },

  // Logout button — small icon-only in corner
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  // Main
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  // Permission box
  permissionBox: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#fafafa",
    width: "100%",
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  permissionBody: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#000",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default Dialler;
