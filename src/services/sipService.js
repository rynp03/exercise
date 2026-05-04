import JsSIP from "jssip";

const WSS_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

let ua = null;

const sipService = {
  init: ({ sip_user, sip_password, sip_domain }, callbacks = {}) => {
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
            // Access RTCPeerConnection after call is confirmed
            const pc = session?.connection;
            if (pc) {
              console.log(
                "[ICE] confirmed — ICE:",
                pc.iceConnectionState,
                "| conn:",
                pc.connectionState,
              );
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
