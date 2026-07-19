const peers = {};

export function isWebRTCSupported() {
  return !!window.RTCPeerConnection;
}

export function startWebRTCStream(camId, videoElement, { onLoading, onError } = {}) {
  if (peers[camId]) stopWebRTCStream(camId);
  if (!videoElement) return;

  if (onLoading) onLoading(true);

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
      videoElement.onplaying = () => { if (onLoading) onLoading(false); };
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      setTimeout(() => {
        if (peers[camId]) {
          stopWebRTCStream(camId);
          startWebRTCStream(camId, videoElement, { onLoading, onError });
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
      if (onError) onError(err);
      if (onLoading) onLoading(false);
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
