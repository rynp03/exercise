# TalkWisely — React Native SIP Calling Exercise

[![Expo](https://img.shields.io/badge/Expo-000000?style=for-the-badge&logo=expo&logoColor=white)](https://www.npmjs.com/package/expo)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://www.npmjs.com/package/react-native)
[![JsSIP](https://img.shields.io/badge/JsSIP-3B82F6?style=for-the-badge)](https://www.npmjs.com/package/jssip)
[![WebRTC](https://img.shields.io/badge/WebRTC-0F172A?style=for-the-badge)](https://www.npmjs.com/package/react-native-webrtc)
[![Zustand](https://img.shields.io/badge/Zustand-18181B?style=for-the-badge)](https://www.npmjs.com/package/zustand)
[![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge)](https://www.npmjs.com/package/axios)
[![CryptoJS](https://img.shields.io/badge/CryptoJS-111827?style=for-the-badge)](https://www.npmjs.com/package/crypto-js)

---

### Download (Android APK)
**APK link**: [Download APK](https://drive.google.com/file/d/1cjdB1etAQwF7xuoytQoCbgCd9uGW0BKn/view?usp=sharing)

---

### What’s implemented (core)
- **Auth + credentials**: Login to backend, fetch encrypted SIP credentials, decrypt (AES-256-CBC / PKCS7)
- **SIP registration**: Register a SIP UA via JsSIP over WebSocket
- **Outgoing calls**: Dial extension/number, connect call, end call
- **Call state machine**: `Idle → Calling → Connected → Ended` (no phantom / stuck states)
- **Cleanup**: Stop UA + terminate session + clear timers on unmount/logout

---

### Optional / bonus (implemented)
- **Mute / unmute**
- **Call duration timer**
- **Speaker / earpiece route toggle**

---

### Project structure
```text
.
├── App.js
├── index.js                # imports webrtc-polyfills FIRST
├── webrtc-polyfills.js     # react-native-webrtc globals for JsSIP
└── src/
    ├── navigation/
    ├── screens/
    │   ├── auth/Login.js
    │   └── mains/Dialler.js
    ├── services/
    │   ├── authService.js
    │   └── sipService.js
    ├── store/
    └── utils/
```

---

### Setup
#### Prerequisites
- Node.js + npm/yarn
- Expo tooling (EAS / Expo CLI)
- A **real device** for testing (WebRTC is unreliable in emulators/simulators)

#### Install
```bash
npm install
```

#### Environment variables
Add a `.env` file (or set these in your build environment) with the following keys:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SOCKET_URL`
- `EXPO_PUBLIC_DECRYPTION_SECRET`
- `EXPO_PUBLIC_SESSION_KEY`

> Note: `index.js` imports `webrtc-polyfills.js` before anything else so JsSIP can access the WebRTC globals.

---

### Run
```bash
npm run start
```

Use **Expo Dev Client** on a real device:

```bash
# iOS
npx expo run:ios --device

# Android
npx expo run:android --device
```

---

### How to use
1. **Login** with provided credentials.
2. App fetches permissions payload and **decrypts SIP credentials**.
3. Wait for **SIP status = Registered**.
4. Enter an extension/number and tap **Call**.
5. Use **Mute**, **Speaker/Earpiece**, **Keypad**, and **End** during the call.

---

### Notes / known limitations
- **Mic indicator behavior** (iOS/Android): the system indicator reflects **active capture**, not “are we sending audio”. Muting a call can still keep the indicator on if capture remains active.
- **Permissions**: microphone permission must be granted for calls to work.
- **Incoming calls**: not implemented (optional in the exercise).

---

### Tech highlights (mapping to the exercise doc)
- **WebRTC polyfills**: `webrtc-polyfills.js` provides globals required by JsSIP
- **AES decryption**: `src/utils/decryption.js` (AES-256-CBC + PKCS7 via CryptoJS)
- **SIP UA lifecycle**: `src/services/sipService.js` (init / stop / call)

