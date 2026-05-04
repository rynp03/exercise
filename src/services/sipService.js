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
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun.l.google.com:5349" },
            { urls: "stun:stun1.l.google.com:3478" },
            { urls: "stun:stun1.l.google.com:5349" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:5349" },
            { urls: "stun:stun3.l.google.com:3478" },
            { urls: "stun:stun3.l.google.com:5349" },
            { urls: "stun:stun4.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:5349" }
        ],
        },
        eventHandlers: {
          progress:  ()  => eventHandlers.progress?.(),
          confirmed: ()  => eventHandlers.confirmed?.(),
          ended:     (e) => eventHandlers.ended?.(e),
          failed:    (e) => eventHandlers.failed?.(e),
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
