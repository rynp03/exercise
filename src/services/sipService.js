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
};

export default sipService;
