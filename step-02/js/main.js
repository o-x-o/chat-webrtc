'use strict';


// Define initial start time of the call (defined as connection between peers).
let startTime = null;

// Define peer connections, streams and video elements.
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;

let localPeerConnection;
let remotePeerConnection;


// Define MediaStreams callbacks.




// Add behavior for video streams.

// Logs a message with the id and size of a video element.
function logVideoLoaded(event) {
  const video = event.target;
  trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
        `videoHeight: ${video.videoHeight}px.`);
}

localVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('loadedmetadata', logVideoLoaded)
// Logs a message with the id and size of a video element.
// This event is fired when video begins streaming.
remoteVideo.addEventListener('onresize', function logResizedVideo(event) {
  logVideoLoaded(event);

  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    startTime = null;
    trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
  }
});

// Define RTC peer connection behavior.

// Connects with new peer candidate.
function handleConnection(event) {
  const peerConnection = event.target;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    // Gets the "other" peer connection.
    const otherPeer = (peerConnection === localPeerConnection) ?
          remotePeerConnection : localPeerConnection;

    otherPeer.addIceCandidate(newIceCandidate)
      .then(() => {
        trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
      }).catch((error) => {
        trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n`+
        `${error.toString()}.`);
      });

    trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
          `${event.candidate.candidate}.`);
  }
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
  const peerConnection = event.target;
  console.log('ICE state change event: ', event);
  trace(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}.`);
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
  const peerName = getPeerName(peerConnection);
  trace(`${peerName} ${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}


// Define and add behavior to buttons.

// Define action buttons.
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;


// Add click event handlers for buttons.
// Handles start button action: creates local MediaStream.
startButton.addEventListener('click', 
function startAction() {
  startButton.disabled = true;
  // In this codelab, you will be streaming video only: "video: true".
  // Audio will not be streamed because it is set to "audio: false" by default.
  navigator.mediaDevices.getUserMedia({
    video: true,
  }).then(function gotLocalMediaStream(mediaStream) {
      localVideo.srcObject = mediaStream;
      localStream = mediaStream;
      trace('Received local stream.');
      callButton.disabled = false;  // Enable call button.
    }).catch(function handleLocalMediaStreamError(error) {
      trace(`navigator.getUserMedia error: ${error.toString()}.`);
    });
  trace('Requesting local stream.');
});


// Handles call button action: creates peer connection.
callButton.addEventListener('click', function callAction() {
  callButton.disabled = true;
  hangupButton.disabled = false;

  trace('Starting call.');
  startTime = window.performance.now();

  // Get local media stream tracks.
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace(`Using video device: ${videoTracks[0].label}.`);
  }
  if (audioTracks.length > 0) {
    trace(`Using audio device: ${audioTracks[0].label}.`);
  }

  const servers = null;  // Allows for RTC server configuration.

  // Create peer connections and add behavior.
  localPeerConnection = new RTCPeerConnection(servers);
  trace('Created local peer connection object localPeerConnection.');

  localPeerConnection.addEventListener('icecandidate', handleConnection);
  localPeerConnection.addEventListener(
    'iceconnectionstatechange', handleConnectionChange);

  remotePeerConnection = new RTCPeerConnection(servers);
  trace('Created remote peer connection object remotePeerConnection.');

  remotePeerConnection.addEventListener('icecandidate', handleConnection);
  remotePeerConnection.addEventListener(
    'iceconnectionstatechange', handleConnectionChange);

  // Handles remote MediaStream success by adding it as the remoteVideo src.
  remotePeerConnection.addEventListener('addstream', function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace('Remote peer connection received remote stream.');
  });

  // Add local stream to connection and create offer to connect.
  localPeerConnection.addStream(localStream);
  trace('Added local stream to localPeerConnection.');

  trace('localPeerConnection createOffer start.');
  localPeerConnection.createOffer({
    offerToReceiveVideo: 1 // Set up to exchange only video.
  }).then(function createdOffer(description) {
    // Logs offer creation and sets peer connection session descriptions.

    trace(`Offer from localPeerConnection:\n${description.sdp}`);
  
    trace('localPeerConnection setLocalDescription start.');
    localPeerConnection.setLocalDescription(description)
      .then(() => {
        setLocalDescriptionSuccess(localPeerConnection);
      }).catch(setSessionDescriptionError);
  
    trace('remotePeerConnection setRemoteDescription start.');
    remotePeerConnection.setRemoteDescription(description)
      .then(() => {
        setRemoteDescriptionSuccess(remotePeerConnection);
      }).catch(setSessionDescriptionError);

    trace('remotePeerConnection createAnswer start.');
    remotePeerConnection.createAnswer()
    .then(function createdAnswer(description) {
      // Logs answer to offer creation and sets peer connection session descriptions.
      trace(`Answer from remotePeerConnection:\n${description.sdp}.`);
    
      trace('remotePeerConnection setLocalDescription start.');
      remotePeerConnection.setLocalDescription(description)
        .then(() => {
          setLocalDescriptionSuccess(remotePeerConnection);
        }).catch(setSessionDescriptionError);
    
      trace('localPeerConnection setRemoteDescription start.');
      localPeerConnection.setRemoteDescription(description)
        .then(() => {
          setRemoteDescriptionSuccess(localPeerConnection);
        }).catch(setSessionDescriptionError);
    }).catch(setSessionDescriptionError);
  }).catch(setSessionDescriptionError);
});


// Handles hangup action: ends up call, closes connections and resets peers.
hangupButton.addEventListener('click', function hangupAction() {
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  trace('Ending call.');
});


// Define helper functions.

// Gets the name of a certain peer connection.
function getPeerName(peerConnection) {
  return (peerConnection === localPeerConnection) ?
      'localPeerConnection' : 'remotePeerConnection';
}

// Logs an action (text) and the time when it happened on the console.
function trace(text) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);

  console.log(now, text);
}
