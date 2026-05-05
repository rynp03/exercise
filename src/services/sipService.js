import JsSIP from "jssip";

const WSS_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

let ua = null;

const sipService = {
  init: ({ sip_user, sip_password, sip_domain }, callbacks = {}) => {
    // This app re-initialises SIP based on auth/session changes; keep it single-UA.
    if (ua) {
      ua.stop();
      ua = null;
    }

    const socket = new JsSIP.WebSocketInterface(WSS_URL);
    ua = new JsSIP.UA({
      sockets: [socket],
      uri: `sip:${sip_user}@${sip_domain}`,
      password: sip_password,
      register: true,
      session_timers: false,
    });

    ua.on("registered", () => callbacks.onRegistered?.());
    ua.on("registrationFailed", (e) => callbacks.onRegistrationFailed?.(e));
    ua.on("newRTCSession", (e) => callbacks.onNewRTCSession?.(e));

    ua.start();
    return ua;
  },

  stop: () => {
    if (ua) {
      ua.stop();
      ua = null;
    }
  },

  getUA: () => ua,

  makeCall: (destination, sip_domain, eventHandlers = {}) => {
    if (!ua) {
      console.error("[SIP] makeCall: UA not initialised");
      return null;
    }
    try {
      const session = ua.call(`sip:${destination}@${sip_domain}`, {
        mediaConstraints: { audio: true, video: false },
        pcConfig: {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        },
        eventHandlers: {
          progress: () => eventHandlers.progress?.(),
          confirmed: () => {
            // We only get a stable RTCPeerConnection once the call is confirmed.
            const pc = session?.connection;
            if (pc) {
              console.log(
                "[ICE] confirmed — ICE:",
                pc.iceConnectionState,
                "| conn:",
                pc.connectionState,
              );
              // Attaching a capture track here makes the native iOS/Android mic indicator behave as expected.
              try {
                const hasLocalAudioTrack = pc
                  .getSenders?.()
                  ?.some((s) => s?.track?.kind === "audio");
                if (
                  !hasLocalAudioTrack &&
                  typeof navigator !== "undefined" &&
                  navigator.mediaDevices?.getUserMedia
                ) {
                  navigator.mediaDevices
                    .getUserMedia({ audio: true, video: false })
                    .then((stream) => {
                      const [track] = stream.getAudioTracks();
                      if (!track) return;
                      const senders = pc.getSenders?.() || [];
                      const audioSender = senders.find(
                        (s) => s?.track?.kind === "audio" || !s?.track,
                      );
                      if (audioSender?.replaceTrack) {
                        audioSender.replaceTrack(track);
                      } else if (pc.addTrack) {
                        pc.addTrack(track, stream);
                      }
                    })
                    .catch(() => {});
                }
              } catch (_) {}
              pc.oniceconnectionstatechange = () =>
                console.log("[ICE] state →", pc.iceConnectionState);
              pc.onconnectionstatechange = () =>
                console.log("[ICE] conn →", pc.connectionState);
            } else {
              console.log(
                "[ICE] confirmed — no RTCPeerConnection found on session",
              );
            }
            eventHandlers.confirmed?.();
          },
          ended: (e) => {
            console.log(
              "[SIP] call ended — originator:",
              e.originator,
              "| cause:",
              e.cause,
            );
            eventHandlers.ended?.(e);
          },
          failed: (e) => {
            console.log(
              "[SIP] call failed — originator:",
              e.originator,
              "| cause:",
              e.cause,
            );
            eventHandlers.failed?.(e);
          },
        },
      });

      return session;
    } catch (e) {
      console.error("[SIP] makeCall error:", e);
      return null;
    }
  },
};

export default sipService;
