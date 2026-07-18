const peers = {};

export function startWebRTCStream(camId, videoElement) {
  if (peers[camId]) stopWebRTCStream(camId);
  if (!videoElement) return;

  const host = window.location.hostname;
  const url = `http://${host}:8889/${camId}/whep`;

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    sdpSemantics: 'unified-plan',
  });

  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  pc.ontrack = (event) => {
    if (event.track.kind === 'video' || !videoElement.srcObject) {
      videoElement.srcObject = event.streams[0];
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      setTimeout(() => {
        if (peers[camId]) {
          stopWebRTCStream(camId);
          startWebRTCStream(camId, videoElement);
        }
      }, 3000);
    }
  };

  pc.createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .then(() => {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription.sdp,
      });
    })
    .then((res) => {
      if (!res.ok) throw new Error(`WHEP ${res.status}`);
      return res.text();
    })
    .then((sdp) => pc.setRemoteDescription({ type: 'answer', sdp }))
    .catch((err) => {
      console.error(`WebRTC error for ${camId}:`, err);
      pc.close();
      delete peers[camId];
    });

  peers[camId] = pc;
}

export function stopWebRTCStream(camId) {
  if (peers[camId]) {
    peers[camId].close();
    delete peers[camId];
  }
}

export function destroyAllWebRTC() {
  Object.keys(peers).forEach((id) => {
    peers[id].close();
    delete peers[id];
  });
}
