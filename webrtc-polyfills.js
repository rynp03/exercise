import { 
  RTCPeerConnection, 
  RTCIceCandidate, 
  RTCSessionDescription, 
  MediaStream, 
  MediaStreamTrack, 
  mediaDevices 
} from 'react-native-webrtc';

// Set up globals for JsSIP to find
global.RTCPeerConnection = RTCPeerConnection;
global.RTCIceCandidate = RTCIceCandidate;
global.RTCSessionDescription = RTCSessionDescription;
global.MediaStream = MediaStream;
global.MediaStreamTrack = MediaStreamTrack;

if (!global.navigator) {
  global.navigator = {};
}

global.navigator.mediaDevices = mediaDevices;
global.navigator.userAgent = 'react-native';