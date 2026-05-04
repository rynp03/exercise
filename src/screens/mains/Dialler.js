import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeModules,
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

const SIP_STATUS = { REGISTERING: "registering", REGISTERED: "registered", FAILED: "failed" };
const CALL_STATE = { IDLE: "idle", CALLING: "calling", CONNECTED: "connected", ENDED: "ended" };
const KEYPAD = [["1","2","3"], ["4","5","6"], ["7","8","9"], ["*","0","#"]];

const StatusPill = ({ status }) => {
  const isRegistering = status === SIP_STATUS.REGISTERING;
  const isRegistered  = status === SIP_STATUS.REGISTERED;
  return (
    <View style={styles.statusPill}>
      {isRegistering
        ? <ActivityIndicator size="small" color="#000" style={styles.statusIndicator} />
        : <View style={[styles.statusDot, isRegistered ? styles.dotOnline : styles.dotOffline]} />}
      <Text style={[styles.statusText, isRegistered && styles.statusTextOnline]}>
        {isRegistering ? "Registering" : isRegistered ? "Registered" : "Offline"}
      </Text>
    </View>
  );
};

const formatDuration = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const Dialler = ({ navigation }) => {
  const [sipStatus,       setSipStatus]       = useState(SIP_STATUS.REGISTERING);
  const [permissionStatus,setPermissionStatus] = useState(null);
  const [dialInput,       setDialInput]       = useState("");
  const [callState,       setCallState]       = useState(CALL_STATE.IDLE);
  const [callDuration,    setCallDuration]    = useState(0);
  const [showInCallKeypad,setShowInCallKeypad]= useState(true);
  const [isMuted,         setIsMuted]         = useState(false);
  const [isSpeakerOn,     setIsSpeakerOn]     = useState(false);
  const [calledNumber,    setCalledNumber]    = useState("");

  const sessionRef = useRef(null);
  const timerRef   = useRef(null);
  const endedTimerRef = useRef(null);

  const sipCredentials = useAuthStore((s) => s.sipCredentials);
  const clearAuth      = useAuthStore((s) => s.clear);

  useEffect(() => { requestMicPermission(); }, []);

  useEffect(() => {
    if (!sipCredentials) return;
    sipService.init(sipCredentials, {
      onRegistered:        () => setSipStatus(SIP_STATUS.REGISTERED),
      onRegistrationFailed: () => setSipStatus(SIP_STATUS.FAILED),
      onNewRTCSession:     handleNewRTCSession,
    });
    return () => sipService.stop();
  }, [sipCredentials]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(endedTimerRef.current);
      try { sessionRef.current?.terminate(); } catch {}
    };
  }, []);

  const handleNewRTCSession = () => {};

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

  const pressKey = (key) => {
    if (callState === CALL_STATE.CALLING || callState === CALL_STATE.CONNECTED) {
      try { sessionRef.current?.sendDTMF?.(key); } catch {}
      return;
    }
    setDialInput((prev) => (prev.length < 16 ? prev + key : prev));
  };
  const backspace = () => setDialInput((prev) => prev.slice(0, -1));

  const startCall = () => {
    if (sipStatus !== SIP_STATUS.REGISTERED || !dialInput.trim()) return;

    const number = dialInput.trim();
    setCalledNumber(number);

    const session = sipService.makeCall(number, sipCredentials.sip_domain, {
      progress:  () => setCallState(CALL_STATE.CALLING),
      confirmed: () => {
        setCallState(CALL_STATE.CONNECTED);
        setCallDuration(0);
        setShowInCallKeypad(true);
        setIsMuted(false);
        setIsSpeakerOn(false);
        timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
      },
      ended:  () => showEndedThenReset(),
      failed: () => showEndedThenReset(),
    });

    if (session) {
      sessionRef.current = session;
      setCallState(CALL_STATE.CALLING);
    }
  };

  const endCall = () => {
    try { sessionRef.current?.terminate(); } catch {}
    showEndedThenReset();
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    try {
      if (nextMuted) sessionRef.current?.mute?.({ audio: true });
      else sessionRef.current?.unmute?.({ audio: true });
    } catch {}
    setIsMuted(nextMuted);
  };

  const toggleSpeaker = () => {
    const nextSpeaker = !isSpeakerOn;
    try {
      NativeModules?.InCallManager?.setForceSpeakerphoneOn?.(nextSpeaker);
      NativeModules?.InCallManager?.setSpeakerphoneOn?.(nextSpeaker);
    } catch {}
    setIsSpeakerOn(nextSpeaker);
  };

  const showEndedThenReset = () => {
    clearInterval(timerRef.current);
    timerRef.current  = null;
    setCallState(CALL_STATE.ENDED);
    clearTimeout(endedTimerRef.current);
    endedTimerRef.current = setTimeout(() => {
      resetCall();
    }, 1000);
  };

  const resetCall = () => {
    clearInterval(timerRef.current);
    timerRef.current  = null;
    clearTimeout(endedTimerRef.current);
    endedTimerRef.current = null;
    sessionRef.current = null;
    setCallState(CALL_STATE.IDLE);
    setCallDuration(0);
    setShowInCallKeypad(false);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setCalledNumber("");
  };

  const canCall = sipStatus === SIP_STATUS.REGISTERED && dialInput.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.topBarSide} />
        <StatusPill status={sipStatus} />
        <View style={styles.topBarSide}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Feather name="log-out" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.container}>
        {permissionStatus && !permissionStatus.granted ? (
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
        ) : (
          <>
            {callState === CALL_STATE.IDLE && (
              <>
                <View style={styles.displayRow}>
                  <View style={styles.displayTextWrap}>
                    <Text
                      style={[styles.displayText, !dialInput && styles.displayPlaceholder]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {dialInput || "Enter number"}
                    </Text>
                  </View>
                  <View style={styles.backspaceSlot}>
                    {dialInput.length > 0 ? (
                      <TouchableOpacity onPress={backspace} style={styles.backspaceBtn} activeOpacity={0.6}>
                        <Feather name="delete" size={22} color="#444" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={styles.keypad}>
                  {KEYPAD.map((row, ri) => (
                    <View key={ri} style={styles.keypadRow}>
                      {row.map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={styles.key}
                          onPress={() => pressKey(key)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.keyText}>{key}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.callBtn, !canCall && styles.callBtnDisabled]}
                  onPress={startCall}
                  disabled={!canCall}
                  activeOpacity={0.8}
                >
                  <Feather name="phone" size={26} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {(callState === CALL_STATE.CALLING || callState === CALL_STATE.CONNECTED || callState === CALL_STATE.ENDED) && (
              <View style={styles.inCallScreen}>
                <View style={styles.inCallTop}>
                  <Text style={styles.inCallNumber}>{calledNumber}</Text>
                  <Text style={styles.inCallStatus}>
                    {callState === CALL_STATE.CALLING
                      ? "Calling..."
                      : callState === CALL_STATE.CONNECTED
                      ? "Connected"
                      : "Ended"}
                  </Text>
                  {callState === CALL_STATE.CONNECTED && (
                    <Text style={styles.inCallTime}>{formatDuration(callDuration)}</Text>
                  )}
                </View>

                {callState === CALL_STATE.CONNECTED && (
                  <View style={styles.inCallActions}>
                    {showInCallKeypad && (
                      <View style={[styles.keypad, { marginBottom: 20 }]}>
                        {KEYPAD.map((row, ri) => (
                          <View key={ri} style={styles.keypadRow}>
                            {row.map((key) => (
                              <TouchableOpacity
                                key={key}
                                style={styles.key}
                                onPress={() => pressKey(key)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.keyText}>{key}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.secondaryBtn} onPress={toggleMute} activeOpacity={0.8}>
                        <Feather name={isMuted ? "mic-off" : "mic"} size={16} color="#222" />
                        <Text style={styles.secondaryBtnText}>{isMuted ? "Unmute" : "Mute"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryBtn} onPress={toggleSpeaker} activeOpacity={0.8}>
                        <Feather name={isSpeakerOn ? "volume-2" : "phone"} size={16} color="#222" />
                        <Text style={styles.secondaryBtnText}>{isSpeakerOn ? "Speaker" : "Earpiece"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowInCallKeypad((v) => !v)} activeOpacity={0.8}>
                        <Feather name="grid" size={16} color="#222" />
                        <Text style={styles.secondaryBtnText}>{showInCallKeypad ? "Hide" : "Keypad"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {(callState === CALL_STATE.CALLING || callState === CALL_STATE.CONNECTED) && (
                  <View style={styles.inCallBottom}>
                    <TouchableOpacity style={styles.endBtn} onPress={endCall} activeOpacity={0.8}>
                      <Feather name="phone-off" size={26} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topBarSide:       { flex: 1, alignItems: "flex-end" },
  statusPill:       { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, gap: 6 },
  statusIndicator:  { width: 14, height: 14 },
  statusDot:        { width: 8, height: 8, borderRadius: 4 },
  dotOnline:        { backgroundColor: "#22c55e" },
  dotOffline:       { backgroundColor: "#aaa" },
  statusText:       { fontSize: 13, fontWeight: "600", color: "#666", letterSpacing: 0.2 },
  statusTextOnline: { color: "#000" },
  logoutBtn:        { width: 34, height: 34, borderRadius: 10, backgroundColor: "#000", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },

  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },

  displayRow:         { flexDirection: "row", alignItems: "center", width: "100%", minHeight: 44, marginBottom: 28, paddingHorizontal: 4 },
  displayTextWrap:    { flex: 1, justifyContent: "center", paddingRight: 4 },
  displayText:        { fontSize: 32, fontWeight: "300", color: "#000", letterSpacing: 2, textAlign: "center" },
  displayPlaceholder: { color: "#ccc", fontWeight: "400", letterSpacing: 0.5 },
  backspaceSlot:      { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backspaceBtn:       { width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  keypad:    { width: "100%", gap: 10 },
  keypadRow: { flexDirection: "row", justifyContent: "space-between" },
  key: {
    flex: 1,
    marginHorizontal: 6,
    height: 58,
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontSize: 22, fontWeight: "400", color: "#000" },

  callBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 36,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  callBtnDisabled: { backgroundColor: "#ccc", shadowOpacity: 0 },
  endBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },

  inCallScreen:  { flex: 1, width: "100%", alignItems: "center", justifyContent: "space-between", paddingVertical: 48 },
  inCallTop:     { alignItems: "center", gap: 8 },
  inCallNumber:  { fontSize: 42, fontWeight: "300", color: "#000", letterSpacing: 2 },
  inCallStatus:  { fontSize: 18, fontWeight: "500", color: "#555" },
  inCallTime:    { fontSize: 16, fontWeight: "500", color: "#444" },
  inCallActions: { width: "100%", gap: 12 },
  inCallBottom:  { alignItems: "center" },

  actionRow:       { flexDirection: "row", gap: 10, width: "100%" },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 4,
    paddingHorizontal: 8,
  },
  secondaryBtnText: { color: "#222", fontSize: 11, fontWeight: "600" },

  permissionBox:   { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 16, padding: 24, backgroundColor: "#fafafa", width: "100%" },
  permissionTitle: { fontSize: 15, fontWeight: "700", color: "#000", marginBottom: 8 },
  permissionBody:  { fontSize: 13, color: "#666", lineHeight: 20 },
  retryBtn:        { marginTop: 16, backgroundColor: "#000", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  retryText:       { color: "#fff", fontSize: 14, fontWeight: "600" },
});

export default Dialler;
