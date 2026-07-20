const peers = {};
const streams = {};
const retryTimers = {};
const MAX_RETRIES = Infinity;
const RETRY_DELAY_MS = 3000;

export function isWebRTCSupported() {
  return !!window.RTCPeerConnection;
}

export function startWebRTCStream(camId, videoElement, { onLoading, onError } = {}) {
  if (!videoElement) return;

  if (peers[camId] && streams[camId]) {
    videoElement.srcObject = streams[camId];
    videoElement.play().catch(() => {});
    if (onLoading) onLoading(false);
    if (onError) onError(false);
    return;
  }

  if (peers[camId]) stopWebRTCStream(camId);

  if (!retryTimers[camId]) retryTimers[camId] = { count: 0 };

  if (onLoading) onLoading(true);
  if (onError) onError(false);

  const host = window.location.hostname;
  const url = `http://${host}:8889/${camId}_h264/whep`;

  const pc = new RTCPeerConnection({
    iceServers: [],
    sdpSemantics: 'unified-plan',
  });

  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  let streamActive = false;

  pc.ontrack = (event) => {
    if (event.track.kind === 'video' || !videoElement.srcObject) {
      videoElement.srcObject = event.streams[0];
      streams[camId] = event.streams[0];
      streamActive = true;
      retryTimers[camId].count = 0;
      videoElement.onplaying = () => { if (onLoading) onLoading(false); };
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      delete streams[camId];
      if (streamActive) {
        scheduleRetry(camId, videoElement, { onLoading, onError });
      }
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
      delete streams[camId];
      scheduleRetry(camId, videoElement, { onLoading, onError });
    });

  peers[camId] = pc;
}

function scheduleRetry(camId, videoElement, callbacks) {
  const state = retryTimers[camId];
  if (!state) return;
  if (state.count >= MAX_RETRIES) {
    if (callbacks.onError) callbacks.onError(new Error('max retries'));
    if (callbacks.onLoading) callbacks.onLoading(false);
    return;
  }
  state.count++;
  if (retryTimers[camId].timer) clearTimeout(retryTimers[camId].timer);
  retryTimers[camId].timer = setTimeout(() => {
    if (peers[camId]) return;
    startWebRTCStream(camId, videoElement, callbacks);
  }, RETRY_DELAY_MS);
}

export function stopWebRTCStream(camId) {
  if (peers[camId]) {
    peers[camId].close();
    delete peers[camId];
  }
  delete streams[camId];
  if (retryTimers[camId]) {
    if (retryTimers[camId].timer) clearTimeout(retryTimers[camId].timer);
    delete retryTimers[camId];
  }
}

export function destroyAllWebRTC() {
  Object.keys(peers).forEach((id) => {
    peers[id].close();
    delete peers[id];
  });
  Object.keys(streams).forEach((id) => delete streams[id]);
  Object.keys(retryTimers).forEach((id) => {
    if (retryTimers[id].timer) clearTimeout(retryTimers[id].timer);
    delete retryTimers[id];
  });
}
